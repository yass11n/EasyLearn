const asyncHandler = require("express-async-handler");
const { google } = require("googleapis");
const Test = require("../models/test.model");
const { recordNotFound } = require("../utils/response/errors");
const { success } = require("../utils/response/response");
const factory = require('../services/factory.service');
const Course = require('../models/Course.model');

// Authenticate with Google Sheets API and define spreadsheet ID
async function getClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets.readonly"
    });
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: client });
    return { auth, googleSheets }; // Return both objects
}

//extract id from spreadsheetlink
function extractSheetId(spreadSheetLink) {
    const pattern = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = spreadSheetLink.match(pattern);
    if (match) {
        return match[1];
    } else {
        return null;
    }
}

// Function to fetch and format questions from Google Sheets
async function getFormattedQuestions(Link) {
    const { auth, googleSheets } = await getClient();
    const sheetId = extractSheetId(Link);
    // Get sheet info (including name)
  const getSheetInfo = await googleSheets.spreadsheets.get({
    auth,
    spreadsheetId: sheetId,
  });
  //get sheet name
  const sheetTitle = getSheetInfo.data.sheets[0].properties.title;

  // Construct the range using the retrieved sheet name
  const range = `${sheetTitle}!A:F`;

  const getRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId: sheetId,
    range,
  });
    const allQuestions = getRows.data.values || [];

    // Randomly select 5 questions (if there are enough)
    const randomQuestions = [];
    while (randomQuestions.length < 10 && allQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * allQuestions.length);
        randomQuestions.push(allQuestions.splice(randomIndex, 1)[0]);
    }

    // Error handling and inform user if not enough questions
    if (randomQuestions.length < 10) {
        console.warn(`There are less than 10 questions in the spreadsheet. Returning ${randomQuestions.length} questions.`);
    }

    const formattedQuestions = randomQuestions.map(questionData => {
        const [question, choiceA, choiceB, choiceC, choiceD, correctAnswer] = questionData;
        const choices = [choiceA, choiceB, choiceC, choiceD];
        const correctAnswerIndex = choices.findIndex(choice => choice === correctAnswer);
        return {
            question:question,
            choices:choices,
            correctAnswer:correctAnswerIndex,
        };
    });
    return formattedQuestions;
}

/**
 * @description Create a new test from fetched questions.
 * @route POST /api/v1/tests
 * @access Protected (requires authentication)
 */
const createTest = asyncHandler(async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        console.log(courseId)
        // get course by id
        const course = await Course.findById(courseId);
        // check if course exists
        if (!course) {
            return next(recordNotFound({ message: "Course not found" }))
        }
        //get spreadsheet link
        const sprdsheetlnk=course.spreadsheetlink;
        //get spreadsheet questions
        const formattedQuestions = await getFormattedQuestions(sprdsheetlnk);

        // Create a new Test document with questions and courseId
        const test = await Test.create({
            test: formattedQuestions,
            course: courseId,
            user: req.user._id,
        });

        const { statusCode, body } = success({ message: "Test created successfully", data: { results: test } })
        res.status(statusCode).json(body);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

/**
 * @description get all tests
 * @route GET /api/v1/tests
 * @access Protected (requires authentication)
 */
const getAllTests = factory.getAll(Test);

/**
 * @description get test by id
 * @route GET /api/v1/tests/:id
 * @access Protected (requires authentication)
 */
const getTestById = factory.getOne(Test);

/**
 * @description delete test by id
 * @route DELETE /api/v1/tests
 * @access Protected (requires authentication)
 */
const deleteTest = factory.deleteOne(Test);

module.exports = {
    createTest,
    getAllTests,
    getTestById,
    deleteTest,
};
