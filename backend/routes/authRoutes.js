const express = require("express");

const {
  login,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,

    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId,
      permissions: req.user.permissions,
    },
  });
});

module.exports = router;