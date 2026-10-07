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

/**
 * CREATE QUESTION
 */
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  createQuestion
);

/**
 * GET QUESTIONS FOR FORM
 */
router.get(
  "/form/:formId",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "MANAGER"
  ),
  getQuestions
);

/**
 * GET SINGLE QUESTION
 */
router.get(
  "/:id",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "MANAGER"
  ),
  getQuestionById
);

/**
 * UPDATE QUESTION
 */
router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateQuestion
);

/**
 * UPDATE QUESTION STATUS
 */
router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateQuestionStatus
);

module.exports = router;