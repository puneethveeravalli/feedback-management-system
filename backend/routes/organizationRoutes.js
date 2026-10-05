const express = require("express");

const {
  createOrganization,getOrganizations,getOrganizationById,updateOrganization,updateOrganizationStatus,createOrganizationAdmin
} = require("../controllers/organizationController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  createOrganization
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  getOrganizations
);
router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  getOrganizationById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  updateOrganization
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN"),
  updateOrganizationStatus
);

router.post(
  "/:organizationId/admin",
  protect,
  authorize("SUPER_ADMIN"),
  createOrganizationAdmin
);

module.exports = router;