const asyncHandler = require("express-async-handler");
// const ffmpeg = require('fluent-ffmpeg');
const { Module, calculateModuleDuration }
  = require('../models/Module.model');
const Section = require('../models/section.model');
const { uploadMix, uploadFilesToCloudinary } = require("../services/file-upload.service")
const factory = require("../services/factory.service");

const {
  recordNotFound,
} = require("../utils/response/errors");
const { success } = require("../utils/response/response");
const uploadModuleVideos = uploadMix([{ name: "file" }])

const uploadVideosToCloud = asyncHandler(async (req, res, next) => {
  if (req.files.file) {
    console.log("yess");
    req.body.file = [];
    const veds = req.files.file
    console.log(veds);

    const uploadPromises = veds.map((v) => {
      console.log("hello", v);
      return uploadFilesToCloudinary(v.buffer, "modules").then((result) => {
        console.log("ioioi");
        console.log(result, v);
        //set the path to secure_url and filename to public_id from result
        req.body.file.push({ path: result.secure_url, filename: result.public_id });
        console.log("donee");
      });
    });
    await Promise.all(uploadPromises);

  }
  next();
})

/**
 * @description create coursesmodules
 * @route POST /api/v1/coursemodule
 * @access private [Instructor, Admin]
 */
const createModule = async ({ file, Name, isFree }) => {
  try {
    // 1- upload the vedio to cloudnary
    const result = await uploadFilesToCloudinary(file.buffer, "modules");
    console.log("RESULTTTTTT: ", result);

    // 2- check if exists
    if (result && result.public_id && result.secure_url) {

      // 3- Create the module in the database
      const newModule = await Module.create({
        name: Name,
        file: {
          filename: result.public_id,
          path: result.secure_url,
        },
        isFree: isFree

      });
      // calculate section duration
      const Duration = await calculateModuleDuration(result.secure_url);

      console.log("Duration: " + Duration);
      // convert duration to hours:minutes:seconds
      const hours = Duration / 3600;
      const minutes = (Duration % 3600) / 60;
      const seconds = Duration % 60;
      console.log("hours: " + hours + " ,minutes: " + minutes + " ,seconds: " + seconds)

      //Update the module's duration field
      newModule.duration.hours = hours;
      newModule.duration.minutes = minutes;
      newModule.duration.seconds = seconds;
      // save module
      await newModule.save();


      return newModule;
    } else {
      // Handle the case where the upload to Cloudinary did not succeed
      console.error("Failed to upload file to Cloudinary");
      return null;
    }
  } catch (error) {
    console.error("Error creating module:", error);
    return null;
  }

};

/**
 * @description get all coursesmodules
 * @route GET /api/v1/coursemodule
 * @access private [Instructor, Admin]
 */
const getAllModules = factory.getAll(Module);


/**
 * @description get module by id
 * @route GET /api/v1/coursemodule/:id
 * @access private [Instructor, Admin]
 */
const getModuleById = factory.getOne(Module);

/**
 * @description update module by id
 * @route PUT /api/v1/coursemodule/:id
 * @access private [Instructor, Admin]
 */
// factory.updateOne(Module);
const updateModule = asyncHandler(async (req, res, next) => {
  // get module id
  const moduleId = req.params.id;
  try {
    console.log(req.body.isFree)
    // get module by id
    const module = await Module.findById(moduleId);

    // Check if the module exists
    if (!module) {
      return next(recordNotFound({ message: `module with id ${req.params.id} not found` }))
    }

    const updatedModuleData = {};
    if (req.body.isFree !== moduleId.isFree) {
      updatedModuleData.isFree = req.body.isFree;
    }
    if (req.body.name !== moduleId.name) {
      updatedModuleData.name = req.body.name;
    }
    console.log(updatedModuleData);
    // update module data
    const update = await Module.findByIdAndUpdate(moduleId, updatedModuleData, { new: true });

    // return response
    const { statusCode, body } = success({ data: update })
    res.status(statusCode).json(body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @description delete module by id
 * @route DELETE /api/v1/coursemodule/:id
 * @access private [Instructor, Admin]
 */
const deleteModule = asyncHandler(async (req, res, next) => {
  try {
    const moduleId = req.params.id;

    // 1- Get module by id
    const module = await Module.findById(moduleId);

    // 2- Check if module exists
    if (!module) {
      return next(recordNotFound({ message: `Module with id ${moduleId} not found` }));
    }

    // Calculate the total duration of the module in seconds
    const totalModuleDurationInSeconds =
      (module.duration.hours * 3600) +
      (module.duration.minutes * 60) +
      module.duration.seconds;

    // 3- Find the section containing the module
    const section = await Section.findOne({ modules: moduleId });

    if (section) {
      // Remove the module from the section's array
      section.modules.pull(moduleId);

      // Convert current sectionDuration to seconds
      const currentSectionDurationInSeconds =
        (section.sectionDuration.hours * 3600) +
        (section.sectionDuration.minutes * 60) +
        section.sectionDuration.seconds;

      // Subtract the module duration from the section duration
      let newSectionDurationInSeconds = currentSectionDurationInSeconds - totalModuleDurationInSeconds;
      if (newSectionDurationInSeconds < 0) newSectionDurationInSeconds = 0;

      // Convert new duration back to hours, minutes, and seconds
      const newHours = Math.floor(newSectionDurationInSeconds / 3600);
      const newMinutes = Math.floor((newSectionDurationInSeconds % 3600) / 60);
      const newSeconds = newSectionDurationInSeconds % 60;

      section.sectionDuration.hours = newHours;
      section.sectionDuration.minutes = newMinutes;
      section.sectionDuration.seconds = newSeconds;

      await section.save();
    }

    // 4- Delete the module
    await Module.findByIdAndDelete(moduleId);

    const { statusCode, body } = success({ message: `Module deleted successfully` });
    res.status(statusCode).json(body);
  } catch (error) {
    next(error);
  }
});

/**
 * @description calculate module duration
 * updating the duration of a specific module to be like hours:mintes:seconds
 * @route PUT /api/v1/coursemodule/calculate-duration/:id
 */
const CalcDuration = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    console.log(moduleId)
    // get module by id
    const module = await Module.findById(moduleId);
    // check if module exists
    if (!module) {
      return next(recordNotFound({ message: 'Module not found' }));
    }

    console.log(module);
    // calculate duration in seconds
    const duration = await calculateModuleDuration(module.file.path);

    // convert duration to hours:minutes:seconds
    const hours = duration / 3600;
    const minutes = (duration % 3600) / 60;
    const seconds = duration % 60;
    console.log("hours: " + hours + " ,minutes: " + minutes + " ,seconds: " + seconds)

    //Update the module's duration field
    module.duration.hours = hours;
    module.duration.minutes = minutes;
    module.duration.seconds = seconds;
    // save module
    await module.save();

    // Respond with the updated module
    res.json({
      message: "Module duration calculated and updated successfully",
      data: module.duration,
    });
  } catch (error) {
    console.error("Error calculating module duration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * @description set module vedios to free, or not free
 * if vedio is free set it to not free, and if vedio is not free set it to free
 * @route PUT /api/v1/coursemodule/setFreeNotFree/:id
 */
const setFreeNotFree = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    //get module by id
    const module = await Module.findById(moduleId);
    //check if exists
    if (!module) {
      return next(recordNotFound({ message: 'Module not found' }));
    }
    //check if module is free
    const isfree = module.isFree;
    //if the module is free make it not free
    if (isfree) {
      //make it not free
      module.isFree = false;
      //save changes
      module.save();
      //send response back
      const { statusCode, body } = success({
        message: 'Module is set to not free',
        data: module
      })
      res.status(statusCode).json(body);
    }
    else {
      //if not free make it free
      module.isFree = true;
      //save changes
      module.save();
      //send response back
      const { statusCode, body } = success({
        message: 'Module is set to free',
        data: module
      })
      res.status(statusCode).json(body);
    }

  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  createModule,
  getAllModules,
  getModuleById,
  updateModule,
  deleteModule,
  uploadModuleVideos,
  uploadVideosToCloud,
  CalcDuration,
  setFreeNotFree
};
