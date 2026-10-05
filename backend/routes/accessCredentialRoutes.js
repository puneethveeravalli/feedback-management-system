const express = require("express");

const {
  createAccessCredential,
  getAccessCredentials,
  getAccessCredentialById,
  revokeAccessCredential,validateAccessCredential
} = require("../controllers/accessCredentialController");

const protect  = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("ORG_ADMIN"),
  createAccessCredential
);

router.get(
  "/",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getAccessCredentials
);
router.post(
    "/validate",
    validateAccessCredential
)
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getAccessCredentialById
);

router.patch(
  "/:id/revoke",
  protect,
  authorize("ORG_ADMIN"),
  revokeAccessCredential
);

module.exports = router;