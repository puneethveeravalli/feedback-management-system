const express = require("express");

const {
  createTarget,
  getTargets,
  getTargetById,
  updateTarget,
  updateTargetStatus,
} = require("../controllers/targetController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// Create target
router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createTarget
);


// Get all targets
router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getTargets
);


// Get target by ID
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getTargetById
);


// Update target
router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateTarget
);


// Update target status
router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateTargetStatus
);


module.exports = router;