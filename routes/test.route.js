/**
 * @route /api/v1/test
 */

const { Router } = require("express");
const {
    createTest,
    getAllTests,
    getTestById,
    deleteTest,
} = require("../controller/test.controller");

const { protect, allowedRoles } = require("../services/auth.service");
const router = Router();

// protected
router.use(protect);

router.route("/:courseId")
    .post(createTest)

router.use(allowedRoles("Instructor", "Admin"));

router.route("/")
    .get(getAllTests);

router.route("/:id")
    .get(getTestById)
    .delete(deleteTest)
module.exports = router;