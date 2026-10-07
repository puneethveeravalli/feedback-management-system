const express = require("express");
const { getFormAnalytics, getQuestionAnalytics, getAnalyticsSummary } = require("../controllers/analyticsController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();
router.get("/summary", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getAnalyticsSummary);
router.get("/form/:formId", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getFormAnalytics);
router.get("/question/:questionId", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getQuestionAnalytics);
module.exports = router;
