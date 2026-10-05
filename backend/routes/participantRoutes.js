const express = require("express");

const {
  createParticipant,
  getParticipants,
  getParticipantById,
  updateParticipant,
  updateParticipantStatus,
} = require("../controllers/participantController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createParticipant
);

router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getParticipants
);

router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getParticipantById
);

router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateParticipant
);

router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateParticipantStatus
);

module.exports = router;