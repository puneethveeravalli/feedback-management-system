const express = require("express");

const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  updateQuestionStatus,
} = require("../controllers/questionController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// Create question
router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createQuestion
);


// Get questions for a form
router.get(
  "/form/:formId",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getQuestions
);


// Get single question
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getQuestionById
);


// Update question
router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateQuestion
);


// Update question status
router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateQuestionStatus
);


module.exports = router;