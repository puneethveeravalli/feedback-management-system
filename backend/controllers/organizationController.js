const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| CREATE ORGANIZATION
|--------------------------------------------------------------------------
*/

const createOrganization = async (req, res) => {
  try {
    const { name, description, logo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name must contain at least 2 characters",
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name cannot exceed 100 characters",
      });
    }

    if (description && description.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message:
          "Organization description cannot exceed 500 characters",
      });
    }

    const existingOrganization =
      await Organization.findOne({
        name: trimmedName,
      });

    if (existingOrganization) {
      return res.status(409).json({
        success: false,
        message: "Organization already exists",
      });
    }

    const organization =
      await Organization.create({
        name: trimmedName,
        description: description
          ? description.trim()
          : "",
        logo: logo || "",
      });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error(
      "Create Organization Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating organization",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL ORGANIZATIONS
|--------------------------------------------------------------------------
*/

const getOrganizations = async (req, res) => {
  try {
    const organizations =
      await Organization.find().sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    console.error(
      "Get Organizations Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching organizations",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ORGANIZATION BY ID
|--------------------------------------------------------------------------
*/

const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    const organization =
      await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error(
      "Get Organization Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching organization",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ORGANIZATION
|--------------------------------------------------------------------------
*/

const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo } = req.body;

    const organization =
      await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NAME VALIDATION
    |--------------------------------------------------------------------------
    */

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message:
            "Organization name cannot be empty",
        });
      }

      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Organization name must contain at least 2 characters",
        });
      }

      if (trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Organization name cannot exceed 100 characters",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DUPLICATE NAME CHECK
      |--------------------------------------------------------------------------
      */

      const duplicate =
        await Organization.findOne({
          name: trimmedName,
          _id: { $ne: id },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another organization with this name already exists",
        });
      }

      organization.name = trimmedName;
    }

    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    if (description !== undefined) {
      const trimmedDescription =
        description.trim();

      if (trimmedDescription.length > 500) {
        return res.status(400).json({
          success: false,
          message:
            "Organization description cannot exceed 500 characters",
        });
      }

      organization.description =
        trimmedDescription;
    }

    /*
    |--------------------------------------------------------------------------
    | LOGO
    |--------------------------------------------------------------------------
    */

    if (logo !== undefined) {
      organization.logo = logo;
    }

    await organization.save();

    return res.status(200).json({
      success: true,
      message:
        "Organization updated successfully",
      organization,
    });
  } catch (error) {
    console.error(
      "Update Organization Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating organization",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ORGANIZATION STATUS
|--------------------------------------------------------------------------
*/

const updateOrganizationStatus =
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (
        !["ACTIVE", "INACTIVE"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid organization status",
        });
      }

      const organization =
        await Organization.findByIdAndUpdate(
          id,
          { status },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Organization ${status === "ACTIVE"
            ? "activated"
            : "deactivated"
          } successfully`,
        organization,
      });
    } catch (error) {
      console.error(
        "Update Organization Status Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating organization status",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| CREATE ORGANIZATION ADMIN
|--------------------------------------------------------------------------
*/

const createOrganizationAdmin =
  async (req, res) => {
    try {
      const { organizationId } =
        req.params;

      const {
        name,
        email,
        password,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required",
        });
      }

      const trimmedName = name.trim();
      const normalizedEmail =
        email.trim().toLowerCase();

      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Admin name must contain at least 2 characters",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 6 characters",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ORGANIZATION
      |--------------------------------------------------------------------------
      */

      const organization =
        await Organization.findById(
          organizationId
        );

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found",
        });
      }

      if (
        organization.status !==
        "ACTIVE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot create admin for an inactive organization",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DUPLICATE EMAIL
      |--------------------------------------------------------------------------
      */

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already exists",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE ADMIN
      |--------------------------------------------------------------------------
      */

      const admin =
        await User.create({
          organizationId:
            organization._id,
          name: trimmedName,
          email: normalizedEmail,
          password,
          role: "ORG_ADMIN",
          status: "ACTIVE",
        });

      return res.status(201).json({
        success: true,
        message:
          "Organization Admin created successfully",
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          organizationId:
            admin.organizationId,
          status: admin.status,
        },
      });
    } catch (error) {
      console.error(
        "Create Organization Admin Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while creating organization admin",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET ORGANIZATION ADMINS
|--------------------------------------------------------------------------
*/

const getOrganizationAdmins =
  async (req, res) => {
    try {
      const { organizationId } =
        req.params;

      const organization =
        await Organization.findById(
          organizationId
        );

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found",
        });
      }

      const admins =
        await User.find({
          organizationId,
          role: "ORG_ADMIN",
        })
          .select(
            "_id name email role status createdAt lastLoginAt"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        count: admins.length,
        admins,
      });
    } catch (error) {
      console.error(
        "Get Organization Admins Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching organization admins",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE ORGANIZATION ADMIN STATUS
|--------------------------------------------------------------------------
*/

const updateOrganizationAdminStatus =
  async (req, res) => {
    try {
      const {
        organizationId,
        adminId,
      } = req.params;

      const { status } = req.body;

      if (
        !["ACTIVE", "INACTIVE"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admin status",
        });
      }

      const organization =
        await Organization.findById(
          organizationId
        );

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found",
        });
      }

      const admin =
        await User.findOne({
          _id: adminId,
          organizationId,
          role: "ORG_ADMIN",
        });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message:
            "Organization Admin not found",
        });
      }

      admin.status = status;

      await admin.save();

      return res.status(200).json({
        success: true,
        message: `Organization Admin ${status === "ACTIVE"
            ? "activated"
            : "deactivated"
          } successfully`,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          organizationId:
            admin.organizationId,
          status: admin.status,
        },
      });
    } catch (error) {
      console.error(
        "Update Organization Admin Status Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating organization admin status",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET MY ORGANIZATION
|--------------------------------------------------------------------------
*/

const getMyOrganization = async (
  req,
  res
) => {
  try {
    const organizationId =
      req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "User is not associated with an organization",
      });
    }

    const organization =
      await Organization.findOne({
        _id: organizationId,
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error(
      "Get My Organization Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching organization",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE ORGANIZATION MANAGER
|--------------------------------------------------------------------------
*/


const createOrganizationManager =
  async (req, res) => {
    try {
      const { organizationId } =
        req.params;

      const {
        name,
        email,
        password,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | BASIC VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required",
        });
      }

      const trimmedName =
        name.trim();

      const normalizedEmail =
        email.trim().toLowerCase();

      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Manager name must contain at least 2 characters",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 6 characters",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ORGANIZATION ACCESS CHECK
      |--------------------------------------------------------------------------
      |
      | ORG_ADMIN can create a Manager only inside
      | their own organization.
      |
      */

      if (req.user.role !== "SUPER_ADMIN") {
        if (!req.user.organizationId) {
          return res.status(403).json({
            success: false,
            message: "User is not associated with an organization",
          });
        }

        if (req.user.organizationId.toString() !== organizationId.toString()) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to manage this organization",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | FIND ORGANIZATION
      |--------------------------------------------------------------------------
      */

      const organization =
        await Organization.findById(
          organizationId
        );

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ORGANIZATION STATUS
      |--------------------------------------------------------------------------
      */

      if (
        organization.status !==
        "ACTIVE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cannot create manager for an inactive organization`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DUPLICATE EMAIL
      |--------------------------------------------------------------------------
      */

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already exists",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE MANAGER
      |--------------------------------------------------------------------------
      */

      const manager =
        await User.create({
          organizationId:
            organization._id,

          name: trimmedName,

          email: normalizedEmail,

          password,

          role: "MANAGER",

          status: "ACTIVE",
        });

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(201).json({
        success: true,

        message:
          "Manager created successfully",

        user: {
          id: manager._id,
          name: manager.name,
          email: manager.email,
          role: manager.role,
          organizationId:
            manager.organizationId,
          status: manager.status,
        },
      });
    } catch (error) {
      console.error(
        "Create Organization Manager Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while creating organization manager",
      });
    }
  };

const updateOrganizationManagerStatus = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { managerId } = req.params;
    const { status } = req.body;

    if (!organizationId) return res.status(400).json({ success: false, message: "Select an organization" });
    if (!mongoose.Types.ObjectId.isValid(managerId)) return res.status(400).json({ success: false, message: "Invalid manager ID" });
    if (!["ACTIVE", "INACTIVE"].includes(status)) return res.status(400).json({ success: false, message: "Invalid manager status" });

    const manager = await User.findOne({ _id: managerId, organizationId, role: "MANAGER" });
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    manager.status = status;
    await manager.save();
    return res.status(200).json({ success: true, message: `Manager ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`, user: { id: manager._id, name: manager.name, email: manager.email, role: manager.role, status: manager.status } });
  } catch (error) {
    console.error("Update manager status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update manager status" });
  }
};

/*
|--------------------------------------------------------------------------
| GET ORGANIZATION USERS
|--------------------------------------------------------------------------
*/

const getOrganizationUsers =
  async (req, res) => {
    try {
      const organizationId =
        req.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message:
            "User is not associated with an organization",
        });
      }

      const users =
        await User.find({
          organizationId,
          status: "ACTIVE",
          role: {
            $in: [
              "ORG_ADMIN",
              "MANAGER",
            ],
          },
        })
          .select(
            "_id name email role status"
          )
          .sort({
            name: 1,
          });

      return res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error(
        "Get Organization Users Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching organization users",
      });
    }
  };

module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  updateOrganizationStatus,

  createOrganizationAdmin,
  getOrganizationAdmins,
  updateOrganizationAdminStatus,

  getMyOrganization,

  createOrganizationManager,
  updateOrganizationManagerStatus,
  getOrganizationUsers,
};