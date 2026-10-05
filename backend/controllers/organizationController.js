const Organization = require("../models/Organization");

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

module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  updateOrganizationStatus
};

