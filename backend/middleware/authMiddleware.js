const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Account is inactive" });
    }

    req.user = user;

    // Every organization-scoped controller uses req.organizationId.
    // Normal users are always restricted to their own organization.
    // Super Admin may select an active organization through the header.
    if (user.role === "SUPER_ADMIN") {
      const selectedOrganizationId = req.headers["x-organization-id"];

      if (selectedOrganizationId && mongoose.Types.ObjectId.isValid(selectedOrganizationId)) {
        const organization = await Organization.findById(selectedOrganizationId)
          .select("_id status")
          .lean();

        if (!organization) {
          return res.status(404).json({
            success: false,
            message: "Selected organization was not found",
          });
        }

        req.organizationId = organization._id;
        req.selectedOrganization = organization;
      } else {
        req.organizationId = null;
        req.selectedOrganization = null;
      }
    } else {
      req.organizationId = user.organizationId || null;
      req.selectedOrganization = null;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = protect;
