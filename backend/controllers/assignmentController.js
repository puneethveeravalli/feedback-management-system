const Assignment = require("../models/Assignment");
const FeedbackForm = require("../models/FeedbackForm");
const Group = require("../models/Group");
const Target = require("../models/Target");


// CREATE ASSIGNMENT
const createAssignment = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const {
      formId,
      groupId,
      targetId,
    } = req.body;

    if (!formId || !groupId || !targetId) {
      return res.status(400).json({
        success: false,
        message: "formId, groupId and targetId are required",
      });
    }

    // Validate form
    const form = await FeedbackForm.findOne({
      _id: formId,
      organizationId,
    });

    if (!form) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form",
      });
    }

    // Validate group
    const group = await Group.findOne({
      _id: groupId,
      organizationId,
    });

    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Invalid group",
      });
    }

    // Validate target
    const target = await Target.findOne({
      _id: targetId,
      organizationId,
    });

    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Invalid target",
      });
    }

    // Prevent duplicate assignment
    const existingAssignment = await Assignment.findOne({
      organizationId,
      formId,
      groupId,
      targetId,
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: "This form is already assigned to this group and target",
      });
    }

    const assignment = await Assignment.create({
      organizationId,
      formId,
      groupId,
      targetId,
    });

    const populatedAssignment =
      await Assignment.findById(assignment._id)
        .populate("formId", "title status")
        .populate("groupId", "name status")
        .populate("targetId", "name type status");

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment: populatedAssignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET ALL ASSIGNMENTS
const getAssignments = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const filter = {
      organizationId,
    };

    if (req.query.formId) {
      filter.formId = req.query.formId;
    }

    if (req.query.groupId) {
      filter.groupId = req.query.groupId;
    }

    if (req.query.targetId) {
      filter.targetId = req.query.targetId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const assignments = await Assignment.find(filter)
      .populate("formId", "title status")
      .populate("groupId", "name status")
      .populate("targetId", "name type status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET ASSIGNMENT BY ID
const getAssignmentById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const assignment = await Assignment.findOne({
      _id: id,
      organizationId,
    })
      .populate("formId", "title description status")
      .populate("groupId", "name description status")
      .populate("targetId", "name type description status");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error("Get assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE ASSIGNMENT
const updateAssignment = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const {
      formId,
      groupId,
      targetId,
    } = req.body;

    const assignment = await Assignment.findOne({
      _id: id,
      organizationId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const newFormId = formId || assignment.formId;
    const newGroupId = groupId || assignment.groupId;
    const newTargetId = targetId || assignment.targetId;

    // Validate form
    const form = await FeedbackForm.findOne({
      _id: newFormId,
      organizationId,
    });

    if (!form) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form",
      });
    }

    // Validate group
    const group = await Group.findOne({
      _id: newGroupId,
      organizationId,
    });

    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Invalid group",
      });
    }

    // Validate target
    const target = await Target.findOne({
      _id: newTargetId,
      organizationId,
    });

    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Invalid target",
      });
    }

    // Check duplicate assignment
    const duplicate = await Assignment.findOne({
      _id: { $ne: id },
      organizationId,
      formId: newFormId,
      groupId: newGroupId,
      targetId: newTargetId,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This assignment already exists",
      });
    }

    assignment.formId = newFormId;
    assignment.groupId = newGroupId;
    assignment.targetId = newTargetId;

    await assignment.save();

    const updatedAssignment =
      await Assignment.findById(assignment._id)
        .populate("formId", "title status")
        .populate("groupId", "name status")
        .populate("targetId", "name type status");

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE ASSIGNMENT STATUS
const updateAssignmentStatus = async (req, res) => {
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

    const assignment = await Assignment.findOne({
      _id: id,
      organizationId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    assignment.status = status;

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Assignment status updated successfully",
      assignment,
    });
  } catch (error) {
    console.error("Update assignment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  updateAssignmentStatus,
};