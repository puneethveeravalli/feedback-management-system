const User = require("../models/User");
const generateToken = require("../utils/generateToken");

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
|
| Used by:
| - SUPER_ADMIN
| - ORG_ADMIN
| - MANAGER
| - PARTICIPANT
|
| Participant accounts are linked to the
| Participant collection through participantId.
|
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    /*
     * Validate input
     */
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
     * Find user.
     *
     * Password is select:false in User model,
     * so explicitly include it here.
     */
    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    /*
     * Check account status
     */
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive. Please contact the administrator.",
      });
    }

    /*
     * Participant-specific validation
     *
     * A participant must have a linked
     * Participant record.
     */
    if (
      user.role === "PARTICIPANT" &&
      !user.participantId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Participant account is not properly linked. Please contact the administrator.",
      });
    }

    /*
     * Compare password
     */
    const isPasswordValid =
      await user.comparePassword(
        password
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    /*
     * Update last login
     */
    user.lastLoginAt =
      new Date();

    await user.save();

    /*
     * Generate JWT
     */
    const token =
      generateToken(user);

    /*
     * Return safe user information.
     *
     * IMPORTANT:
     * Never return the hashed password.
     */
    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId:
          user.organizationId || null,

        /*
         * Important for PARTICIPANT.
         */
        participantId:
          user.participantId || null,

        permissions:
          user.permissions || [],

        status:
          user.status,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Login failed. Please try again.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
|
| Used by AuthContext when the application
| starts and an existing JWT is available.
|
|--------------------------------------------------------------------------
*/

const getMe = async (req, res) => {
  try {
    /*
     * req.user is populated by authMiddleware.
     */
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /*
     * Account status is checked again
     * for safety.
     */
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
      });
    }

    /*
     * Participant account must have
     * a linked participant.
     */
    if (
      user.role === "PARTICIPANT" &&
      !user.participantId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Participant account is not properly linked",
      });
    }

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId:
          user.organizationId || null,

        /*
         * Important for participant dashboard.
         */
        participantId:
          user.participantId || null,

        permissions:
          user.permissions || [],

        status:
          user.status,
      },
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch current user",
    });
  }
};

module.exports = {
  login,
  getMe,
};