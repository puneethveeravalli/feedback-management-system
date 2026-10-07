const express = require("express");
const {
  createParticipant,
  bulkUploadParticipants,
  getParticipants,
  getParticipantById,
  updateParticipant,
  updateParticipantStatus,
  getMyParticipant,
  getAvailableFeedback,
  startParticipantFeedback,
} = require("../controllers/participantController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/me", protect, authorize("PARTICIPANT"), getMyParticipant);
router.get("/me/available-feedback", protect, authorize("PARTICIPANT"), getAvailableFeedback);
router.post("/me/start-feedback", protect, authorize("PARTICIPANT"), startParticipantFeedback);

router.post("/", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), createParticipant);
router.post("/bulk", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), bulkUploadParticipants);
router.get("/", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getParticipants);
router.get("/:id", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getParticipantById);
router.patch("/:id", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), updateParticipant);
router.patch("/:id/status", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), updateParticipantStatus);

module.exports = router;
