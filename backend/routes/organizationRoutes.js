const express = require("express");
const {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  updateOrganizationStatus,
  createOrganizationAdmin,
  getOrganizationAdmins,
  updateOrganizationAdminStatus,
  createOrganizationManager,
  updateOrganizationManagerStatus,
  getMyOrganization,
  getOrganizationUsers,
} = require("../controllers/organizationController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();
router.post("/", protect, authorize("SUPER_ADMIN"), createOrganization);
router.get("/", protect, authorize("SUPER_ADMIN"), getOrganizations);
router.get("/my-organization", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), getMyOrganization);
router.get("/users", protect, authorize("SUPER_ADMIN", "ORG_ADMIN", "MANAGER"), getOrganizationUsers);
router.post("/:organizationId/admin", protect, authorize("SUPER_ADMIN"), createOrganizationAdmin);
router.get("/:organizationId/admins", protect, authorize("SUPER_ADMIN"), getOrganizationAdmins);
router.patch("/:organizationId/admin/:adminId/status", protect, authorize("SUPER_ADMIN"), updateOrganizationAdminStatus);
router.get("/:id", protect, authorize("SUPER_ADMIN"), getOrganizationById);
router.patch("/:id", protect, authorize("SUPER_ADMIN"), updateOrganization);
router.patch("/:id/status", protect, authorize("SUPER_ADMIN"), updateOrganizationStatus);
router.post("/:organizationId/manager", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), createOrganizationManager);
router.patch("/manager/:managerId/status", protect, authorize("SUPER_ADMIN", "ORG_ADMIN"), updateOrganizationManagerStatus);
module.exports = router;
