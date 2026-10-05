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


// Create assignment
router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createAssignment
);


// Get assignments
router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getAssignments
);


// Get assignment by ID
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getAssignmentById
);


// Update assignment
router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateAssignment
);


// Update assignment status
router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateAssignmentStatus
);


module.exports = router;