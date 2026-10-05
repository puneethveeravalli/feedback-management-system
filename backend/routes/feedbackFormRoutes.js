const express = require("express");

const {
  createFeedbackForm,
  getFeedbackForms,
  getFeedbackFormById,
  updateFeedbackForm,
  updateFeedbackFormStatus,
} = require("../controllers/feedbackFormController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// Create form
router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createFeedbackForm
);


// Get all forms
router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getFeedbackForms
);


// Get form by ID
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getFeedbackFormById
);


// Update form
router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateFeedbackForm
);


// Update form status
router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateFeedbackFormStatus
);


module.exports = router;