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
  authorize("ORG_ADMIN"),
  createGroup
);

router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getGroups
);

router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getGroupById
);

router.patch(
  "/:id",
  protect,
  authorize("ORG_ADMIN"),
  updateGroup
);

router.patch(
  "/:id/status",
  protect,
  authorize("ORG_ADMIN"),
  updateGroupStatus
);

module.exports = router;