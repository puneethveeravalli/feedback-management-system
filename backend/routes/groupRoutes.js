const express = require("express");

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  updateGroupStatus,
} = require("../controllers/groupController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  createGroup
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getGroups
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getGroupById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateGroup
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateGroupStatus
);

module.exports = router;