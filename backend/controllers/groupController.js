const mongoose = require("mongoose");

const Group = require("../models/Group");
const Department = require("../models/Department");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const createGroup = async (req, res) => {
  try {
    const organizationId =
      req.organizationId;

    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    const { departmentId } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        message:
          "Organization information is missing.",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Group name is required.",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        message:
          "Group name cannot exceed 100 characters.",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        message:
          "Description cannot exceed 500 characters.",
      });
    }

    if (!departmentId) {
      return res.status(400).json({
        message: "Department is required.",
      });
    }

    if (!isValidObjectId(departmentId)) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }

    const department =
      await Department.findOne({
        _id: departmentId,
        organizationId,
        status: "ACTIVE",
      });

    if (!department) {
      return res.status(400).json({
        message:
          "Selected department is not available.",
      });
    }

    const escapedName =
      name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const duplicate =
      await Group.findOne({
        organizationId,
        departmentId,
        name: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
      });

    if (duplicate) {
      return res.status(409).json({
        message:
          "A group with this name already exists in the selected department.",
      });
    }

    const group = await Group.create({
      organizationId,
      departmentId,
      name,
      description,
      status: "ACTIVE",
    });

    return res.status(201).json({
      message: "Group created successfully.",
      group,
    });
  } catch (error) {
    console.error(
      "Create group error:",
      error
    );

    return res.status(500).json({
      message: "Unable to create group.",
    });
  }
};

const getGroups = async (req, res) => {
  try {
    const organizationId =
      req.organizationId;

    const groups = await Group.find({
      organizationId,
    })
      .populate(
        "departmentId",
        "name status"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      groups,
    });
  } catch (error) {
    console.error(
      "Get groups error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load groups.",
    });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid group ID.",
      });
    }

    const group = await Group.findOne({
      _id: id,
      organizationId:
        req.organizationId,
    }).populate(
      "departmentId",
      "name status"
    );

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    return res.status(200).json({
      group,
    });
  } catch (error) {
    console.error(
      "Get group error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load group.",
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid group ID.",
      });
    }

    const group = await Group.findOne({
      _id: id,
      organizationId:
        req.organizationId,
    });

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    const name =
      req.body.name !== undefined
        ? typeof req.body.name === "string"
          ? req.body.name.trim()
          : ""
        : group.name;

    const description =
      req.body.description !== undefined
        ? typeof req.body.description ===
          "string"
          ? req.body.description.trim()
          : null
        : group.description;

    const departmentId =
      req.body.departmentId !== undefined
        ? req.body.departmentId
        : group.departmentId;

    if (!name) {
      return res.status(400).json({
        message: "Group name is required.",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        message:
          "Group name cannot exceed 100 characters.",
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

    if (!departmentId) {
      return res.status(400).json({
        message: "Department is required.",
      });
    }

    if (!isValidObjectId(departmentId)) {
      return res.status(400).json({
        message: "Invalid department ID.",
      });
    }

    const department =
      await Department.findOne({
        _id: departmentId,
        organizationId:
          req.organizationId,
        status: "ACTIVE",
      });

    if (!department) {
      return res.status(400).json({
        message:
          "Selected department is not available.",
      });
    }

    const escapedName =
      name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const duplicate =
      await Group.findOne({
        _id: { $ne: id },
        organizationId:
          req.organizationId,
        departmentId,
        name: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
      });

    if (duplicate) {
      return res.status(409).json({
        message:
          "A group with this name already exists in the selected department.",
      });
    }

    group.name = name;
    group.description = description;
    group.departmentId = departmentId;

    await group.save();

    return res.status(200).json({
      message: "Group updated successfully.",
      group,
    });
  } catch (error) {
    console.error(
      "Update group error:",
      error
    );

    return res.status(500).json({
      message: "Unable to update group.",
    });
  }
};

const updateGroupStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid group ID.",
      });
    }

    if (
      !["ACTIVE", "INACTIVE"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          "Status must be ACTIVE or INACTIVE.",
      });
    }

    const group = await Group.findOne({
      _id: id,
      organizationId:
        req.organizationId,
    });

    if (!group) {
      return res.status(404).json({
        message: "Group not found.",
      });
    }

    group.status = status;

    await group.save();

    return res.status(200).json({
      message: `Group ${
        status === "ACTIVE"
          ? "activated"
          : "deactivated"
      } successfully.`,
      group,
    });
  } catch (error) {
    console.error(
      "Update group status error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update group status.",
    });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  updateGroupStatus,
};