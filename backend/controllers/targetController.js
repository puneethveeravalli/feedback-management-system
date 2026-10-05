const Target = require("../models/Target");
const Department = require("../models/Department");

// CREATE TARGET
const createTarget = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const {
      departmentId,
      name,
      type,
      description,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and type are required",
      });
    }

    // If department is provided,
    // make sure it belongs to the same organization
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

    // Prevent duplicate target name in organization
    const existingTarget = await Target.findOne({
      organizationId,
      name: name.trim(),
    });

    if (existingTarget) {
      return res.status(409).json({
        success: false,
        message: "Target already exists",
      });
    }

    const target = await Target.create({
      organizationId,
      departmentId: departmentId || null,
      name: name.trim(),
      type: type.trim(),
      description: description?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Target created successfully",
      target,
    });
  } catch (error) {
    console.error("Create target error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET ALL TARGETS
const getTargets = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const filter = {
      organizationId,
    };

    // Optional department filter
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    const targets = await Target.find(filter)
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: targets.length,
      targets,
    });
  } catch (error) {
    console.error("Get targets error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET TARGET BY ID
const getTargetById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const target = await Target.findOne({
      _id: id,
      organizationId,
    }).populate("departmentId", "name");

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    return res.status(200).json({
      success: true,
      target,
    });
  } catch (error) {
    console.error("Get target error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE TARGET
const updateTarget = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const {
      departmentId,
      name,
      type,
      description,
    } = req.body;

    const target = await Target.findOne({
      _id: id,
      organizationId,
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    // Validate new department
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

      target.departmentId = departmentId;
    }

    if (name !== undefined) {
      target.name = name.trim();
    }

    if (type !== undefined) {
      target.type = type.trim();
    }

    if (description !== undefined) {
      target.description = description.trim();
    }

    await target.save();

    return res.status(200).json({
      success: true,
      message: "Target updated successfully",
      target,
    });
  } catch (error) {
    console.error("Update target error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE TARGET STATUS
const updateTargetStatus = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const target = await Target.findOne({
      _id: id,
      organizationId,
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    target.status = status;

    await target.save();

    return res.status(200).json({
      success: true,
      message: "Target status updated successfully",
      target,
    });
  } catch (error) {
    console.error("Update target status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  createTarget,
  getTargets,
  getTargetById,
  updateTarget,
  updateTargetStatus,
};