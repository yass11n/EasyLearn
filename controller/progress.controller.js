const Progress = require("../models/progress.model");
const Course = require("../models/Course.model");
const { Module } = require("../models/Module.model");
const asyncHandler = require("express-async-handler");
const { recordNotFound } = require("../utils/response/errors");
const { success } = require("../utils/response/response");

/**
 * @description create / update progress
 * @route PUT /api/v1/progress/
 * @access protected 
 */
const updateProgress = asyncHandler(async (req, res, next) => {
    const { _id: userId } = req.user;
    const { courseId, moduleId } = req.body;

    // Get course by id
    const course = await Course.findById(courseId);
    if (!course) {
        return next(recordNotFound({ message: 'Course not found' }));
    }

    // Get module by id
    const module = await Module.findById(moduleId);
    if (!module) {
        return next(recordNotFound({ message: 'Module not found' }));
    }

    // Calculate module duration in seconds
    const moduleDurationInSeconds = module.duration.hours * 3600 + module.duration.minutes * 60 + module.duration.seconds;

    // Calculate total course duration in seconds
    const totalCourseDurationInSeconds = course.duration.hours * 3600 + course.duration.minutes * 60 + course.duration.seconds;

    // Find existing progress or create new
    let progress = await Progress.findOne({ user: userId, course: courseId });

    if (progress) {
        // Check if module has already been watched
        if (!progress.watchedModules.includes(moduleId)) {
            // Update existing progress
            progress.watchedTime += moduleDurationInSeconds;
            progress.progress = Math.round((progress.watchedTime / totalCourseDurationInSeconds) * 100);
            // Add module to watchedModules array
            progress.watchedModules.push(moduleId);
        }
    } else {
        // Create new progress
        const progressPercentage = Math.round((moduleDurationInSeconds / totalCourseDurationInSeconds) * 100);
        progress = new Progress({
            progress: progressPercentage,
            user: userId,
            course: courseId,
            watchedTime: moduleDurationInSeconds,
            watchedModules: [moduleId], // Initialize watchedModules array
        });
    }

    await progress.save();

    // Send response back
    const { statusCode, body } = success({ data: progress });
    res.status(statusCode).json(body);
});

module.exports = {
    updateProgress,
};
