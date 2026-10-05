const Group = require("../models/Group");
const Department = require("../models/Department");

const createGroup = async (req, res) => {
  try {
    const { name, description, departmentId } = req.body;

    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    // If department is provided, verify it belongs
    // to the same organization
    if (departmentId) {
      const department = await Department.findOne({
        _id: departmentId,
        organizationId,
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }
    }

    // Check duplicate group name inside organization
    const existingGroup = await Group.findOne({
      organizationId,
      name: name.trim(),
    });

    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: "Group already exists",
      });
    }

    const group = await Group.create({
      organizationId,
      departmentId: departmentId || null,
      name: name.trim(),
      description: description || "",
    });

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    console.error("Create Group Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating group",
    });
  }
};
const getGroups = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const groups = await Group.find({
      organizationId,
    })
      .populate("departmentId", "name")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error("Get Groups Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching groups",
    });
  }
};
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const group = await Group.findOne({
      _id: id,
      organizationId,
    }).populate("departmentId", "name");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("Get Group Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching group",
    });
  }
};
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, departmentId } = req.body;

    const organizationId = req.user.organizationId;

    const group = await Group.findOne({
      _id: id,
      organizationId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Group name cannot be empty",
        });
      }

      group.name = name.trim();
    }

    if (description !== undefined) {
      group.description = description;
    }

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        group.departmentId = null;
      } else {
        const department = await Department.findOne({
          _id: departmentId,
          organizationId,
        });

        if (!department) {
          return res.status(400).json({
            success: false,
            message: "Invalid department",
          });
        }

        group.departmentId = departmentId;
      }
    }

    await group.save();

    return res.status(200).json({
      success: true,
      message: "Group updated successfully",
      group,
    });
  } catch (error) {
    console.error("Update Group Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating group",
    });
  }
};
const updateGroupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const organizationId = req.user.organizationId;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group status",
      });
    }

    const group = await Group.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group status updated successfully",
      group,
    });
  } catch (error) {
    console.error("Update Group Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating group status",
    });
  }
};
module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  updateGroupStatus
};
