const express = require("express");

const {
  createAction,
  getActions,
  getActionById,
  updateAction,
  updateActionStatus,
} = require("../controllers/actionController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  createAction
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getActions
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getActionById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateAction
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  updateActionStatus
);

module.exports = router;