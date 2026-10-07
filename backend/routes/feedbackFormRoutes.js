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

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  createFeedbackForm
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getFeedbackForms
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getFeedbackFormById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateFeedbackForm
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateFeedbackFormStatus
);

module.exports = router;