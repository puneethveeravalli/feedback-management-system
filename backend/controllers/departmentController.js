const Department = require("../models/Department");

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

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
        message: "Department name is required",
      });
    }

    const existingDepartment = await Department.findOne({
      organizationId,
      name: name.trim(),
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      organizationId,
      name: name.trim(),
      description: description || "",
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create Department Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating department",
    });
  }
};
const getDepartments = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const departments = await Department.find({
      organizationId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Get Departments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching departments",
    });
  }
};
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const department = await Department.findOne({
      _id: id,
      organizationId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Get Department Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching department",
    });
  }
};
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const organizationId = req.user.organizationId;

    const department = await Department.findOne({
      _id: id,
      organizationId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Department name cannot be empty",
        });
      }

      department.name = name.trim();
    }

    if (description !== undefined) {
      department.description = description;
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update Department Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating department",
    });
  }
};
const updateDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const organizationId = req.user.organizationId;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department status",
      });
    }

    const department = await Department.findOneAndUpdate(
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

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department status updated successfully",
      department,
    });
  } catch (error) {
    console.error(
      "Update Department Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating department status",
    });
  }
};
module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus
};
