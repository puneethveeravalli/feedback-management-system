const express = require("express");
const { submitResponse, getResponseById, getFormResponses } = require("../controllers/responseController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();
router.post("/", submitResponse);
router.get("/form/:formId", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getFormResponses);
router.get("/:id", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getResponseById);
module.exports = router;
