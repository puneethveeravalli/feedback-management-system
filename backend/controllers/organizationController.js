const Organization = require("../models/Organization");
const User = require("../models/User");

const createOrganization = async (req, res) => {
  try {
    const { name, description, logo } = req.body;

    // 1. Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    // 2. Check duplicate organization
    const existingOrganization = await Organization.findOne({
      name: name.trim(),
    });

    if (existingOrganization) {
      return res.status(409).json({
        success: false,
        message: "Organization already exists",
      });
    }

    // 3. Create organization
    const organization = await Organization.create({
      name: name.trim(),
      description: description || "",
      logo: logo || "",
    });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("Create Organization Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating organization",
    });
  }
};

const getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    console.error("Get Organizations Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching organizations",
    });
  }
};
const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id);

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
      message: "Server error while fetching organization",
    });
  }
};
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo } = req.body;

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Organization name cannot be empty",
        });
      }

      organization.name = name.trim();
    }

    if (description !== undefined) {
      organization.description = description;
    }

    if (logo !== undefined) {
      organization.logo = logo;
    }

    await organization.save();

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      organization,
    });
  } catch (error) {
    console.error(
      "Update Organization Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating organization",
    });
  }
};
const updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization status",
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
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Organization ${status.toLowerCase()} successfully`,
      organization,
    });
  } catch (error) {
    console.error(
      "Update Organization Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating organization status",
    });
  }
};
const createOrganizationAdmin = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // 2. Validate organization
    const organization = await Organization.findById(
      organizationId
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // 3. Check organization status
    if (organization.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot create admin for an inactive organization",
      });
    }

    // 4. Check whether email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // 5. Create Organization Admin
    const admin = await User.create({
      organizationId: organization._id,
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: "ORG_ADMIN",
      status: "ACTIVE",
    });

    // 6. Return safe user data
    return res.status(201).json({
      success: true,
      message: "Organization Admin created successfully",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        organizationId: admin.organizationId,
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
      message: "Server error while creating organization admin",
    });
  }
};
module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  updateOrganizationStatus,
  createOrganizationAdmin
};
 

