const express = require("express");
const {
  getFormReport,
  getGroupReport,
  getQuestionReport,
  getPeriodReport,
  getParticipationReport,
  getCommentsReport,
} = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();
const roles = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"];

router.get("/form/:formId", protect, authorize(...roles), getFormReport);
router.get("/group/:groupId", protect, authorize(...roles), getGroupReport);
router.get("/question/:questionId", protect, authorize(...roles), getQuestionReport);
router.get("/period", protect, authorize(...roles), getPeriodReport);
router.get("/participation", protect, authorize(...roles), getParticipationReport);
router.get("/comments", protect, authorize(...roles), getCommentsReport);

module.exports = router;
