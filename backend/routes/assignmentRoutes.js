const express = require("express");
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  updateAssignmentStatus,
} = require("../controllers/assignmentController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), createAssignment);
router.get("/", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getAssignments);
router.get("/:id", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getAssignmentById);
router.patch("/:id", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), updateAssignment);
router.patch("/:id/status", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), updateAssignmentStatus);

module.exports = router;
