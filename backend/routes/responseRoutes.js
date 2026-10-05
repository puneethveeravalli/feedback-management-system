const express = require("express");

const {
  submitResponse,
  getResponseById,
  getFormResponses,
} = require("../controllers/responseController");

const protect  = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// Submit feedback
router.post(
  "/",
  submitResponse
);

// Get all responses for a form
router.get(
  "/form/:formId",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getFormResponses
);
// Get individual response
router.get(
  "/:id",
  protect,
  authorize("ORG_ADMIN", "MANAGER"),
  getResponseById
);





module.exports = router;