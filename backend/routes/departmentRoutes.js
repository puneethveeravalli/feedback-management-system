const express = require("express");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
} = require("../controllers/departmentController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  createDepartment
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getDepartments
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"),
  getDepartmentById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateDepartment
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  updateDepartmentStatus
);

module.exports = router;