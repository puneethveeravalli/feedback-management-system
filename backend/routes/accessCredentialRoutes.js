const express = require("express");

const {
  createAccessCredential,
  getAccessCredentials,
  getAccessCredentialById,
  revokeAccessCredential,
  validateAccessCredential,
} = require("../controllers/accessCredentialController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admin - Create Access Credential
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN"
  ),
  createAccessCredential
);

/*
|--------------------------------------------------------------------------
| Admin / Manager - Get Access Credentials
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "MANAGER"
  ),
  getAccessCredentials
);

/*
|--------------------------------------------------------------------------
| Admin / Manager - Get Single Credential
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "MANAGER"
  ),
  getAccessCredentialById
);

/*
|--------------------------------------------------------------------------
| Admin - Revoke Credential
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/revoke",
  protect,
  authorize(
    "SUPER_ADMIN",
    "ORG_ADMIN"
  ),
  revokeAccessCredential
);



router.post(
  "/validate",
  optionalAuth,
  validateAccessCredential
);

module.exports = router;