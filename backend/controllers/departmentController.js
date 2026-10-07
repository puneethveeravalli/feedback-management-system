const mongoose = require("mongoose");
const Department = require("../models/Department");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const createDepartment = async (req, res) => {
  try {
    const organizationId =
      req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message:
          "Organization information is missing.",
      });
    }

    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    if (!name) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        message:
          "Department name cannot exceed 100 characters.",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        message:
          "Description cannot exceed 500 characters.",
      });
    }

    const existingDepartment =
      await Department.findOne({
        organizationId,
        name: {
          $regex: `^${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          $options: "i",
        },
      });

    if (existingDepartment) {
      return res.status(409).json({
        message:
          "A department with this name already exists.",
      });
    }

    const department =
      await Department.create({
        organizationId,
        name,
        description,
        status: "ACTIVE",
      });

    return res.status(201).json({
      message:
        "Department created successfully.",
      department,
    });
  } catch (error) {
    console.error(
      "Create department error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to create department.",
    });
  }
};

const getDepartments = async (req, res) => {
  try {
    const organizationId =
      req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message:
          "Organization information is missing.",
      });
    }

    const departments =
      await Department.find({
        organizationId,
      }).sort({
        createdAt: -1,
      });

    return res.status(200).json({
      departments,
    });
  } catch (error) {
    console.error(
      "Get departments error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load departments.",
    });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }

    const department =
      await Department.findOne({
        _id: id,
        organizationId:
          req.organizationId,
      });

    if (!department) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      department,
    });
  } catch (error) {
    console.error(
      "Get department error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load department.",
    });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }

    const department =
      await Department.findOne({
        _id: id,
        organizationId:
          req.organizationId,
      });

    if (!department) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    if (
      req.body.name !== undefined &&
      typeof req.body.name !== "string"
    ) {
      return res.status(400).json({
        message:
          "Department name must be a valid text value.",
      });
    }

    const name =
      req.body.name !== undefined
        ? req.body.name.trim()
        : department.name;

    const description =
      req.body.description !== undefined
        ? typeof req.body.description === "string"
          ? req.body.description.trim()
          : null
        : department.description;

    if (!name) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        message:
          "Department name cannot exceed 100 characters.",
      });
    }

    if (description === null) {
      return res.status(400).json({
        message:
          "Description must be a valid text value.",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        message:
          "Description cannot exceed 500 characters.",
      });
    }

    const duplicate =
      await Department.findOne({
        _id: { $ne: id },
        organizationId:
          req.organizationId,
        name: {
          $regex: `^${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          $options: "i",
        },
      });

    if (duplicate) {
      return res.status(409).json({
        message:
          "A department with this name already exists.",
      });
    }

    department.name = name;
    department.description =
      description;

    await department.save();

    return res.status(200).json({
      message:
        "Department updated successfully.",
      department,
    });
  } catch (error) {
    console.error(
      "Update department error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update department.",
    });
  }
};

const updateDepartmentStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        message:
          "Status must be ACTIVE or INACTIVE.",
      });
    }

    const department =
      await Department.findOne({
        _id: id,
        organizationId:
          req.organizationId,
      });

    if (!department) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    department.status = status;

    await department.save();

    return res.status(200).json({
      message:
        `Department ${
          status === "ACTIVE"
            ? "activated"
            : "deactivated"
        } successfully.`,
      department,
    });
  } catch (error) {
    console.error(
      "Update department status error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update department status.",
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
};