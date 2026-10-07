const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const FeedbackForm = require("../models/FeedbackForm");
const Group = require("../models/Group");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const requireOrganization = (req, res) => {
  if (!req.organizationId) {
    res.status(400).json({ success: false, message: "Select an organization before managing assignments." });
    return null;
  }
  return req.organizationId;
};

const getId = (value) => (value && typeof value === "object" ? value._id : value);

const validateAssignment = async ({ organizationId, formId, groupId }) => {
  if (!isValidObjectId(formId) || !isValidObjectId(groupId)) {
    return { error: "Invalid feedback form or group ID" };
  }

  const [form, group] = await Promise.all([
    FeedbackForm.findOne({ _id: formId, organizationId }),
    Group.findOne({ _id: groupId, organizationId }),
  ]);

  if (!form) return { error: "Feedback form not found" };
  if (["CLOSED", "ARCHIVED"].includes(form.status)) return { error: "Closed or archived forms cannot be assigned" };
  if (!group) return { error: "Group not found" };
  if (group.status !== "ACTIVE") return { error: "Only active groups can be assigned" };

  return { form, group };
};

const createAssignment = async (req, res) => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const { formId, groupId } = req.body;
    if (!formId || !groupId) {
      return res.status(400).json({ success: false, message: "formId and groupId are required" });
    }

    const validation = await validateAssignment({ organizationId, formId, groupId });
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });

    const existing = await Assignment.findOne({ organizationId, formId, groupId });
    if (existing) {
      return res.status(409).json({ success: false, message: "This form is already assigned to this group" });
    }

    const assignment = await Assignment.create({
      organizationId,
      formId,
      groupId,
      status: "ACTIVE",
      assignedAt: new Date(),
    });

    const populated = await Assignment.findById(assignment._id)
      .populate("formId", "title status startDate endDate responseMode allowMultipleResponses")
      .populate("groupId", "name status");

    return res.status(201).json({ success: true, message: "Assignment created successfully", assignment: populated });
  } catch (error) {
    console.error("Create assignment error:", error);
    return res.status(500).json({ success: false, message: "Failed to create assignment" });
  }
};

const getAssignments = async (req, res) => {
  try {
    const filter = req.organizationId ? { organizationId: req.organizationId } : {};
    if (req.query.formId && isValidObjectId(req.query.formId)) filter.formId = req.query.formId;
    if (req.query.groupId && isValidObjectId(req.query.groupId)) filter.groupId = req.query.groupId;

    const assignments = await Assignment.find(filter)
      .populate("formId", "title status startDate endDate responseMode allowMultipleResponses")
      .populate("groupId", "name status")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: assignments.length, assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch assignments" });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid assignment ID" });
    const filter = req.organizationId
      ? { _id: req.params.id, organizationId: req.organizationId }
      : { _id: req.params.id };

    const assignment = await Assignment.findOne(filter)
      .populate("formId", "title status startDate endDate responseMode allowMultipleResponses")
      .populate("groupId", "name status");

    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch assignment" });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid assignment ID" });

    const assignment = await Assignment.findOne({ _id: req.params.id, organizationId });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

    const formId = req.body.formId || getId(assignment.formId);
    const groupId = req.body.groupId || getId(assignment.groupId);
    const validation = await validateAssignment({ organizationId, formId, groupId });
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });

    const duplicate = await Assignment.findOne({
      organizationId,
      formId,
      groupId,
      _id: { $ne: assignment._id },
    });
    if (duplicate) return res.status(409).json({ success: false, message: "This form is already assigned to this group" });

    assignment.formId = formId;
    assignment.groupId = groupId;
    await assignment.save();

    const populated = await Assignment.findById(assignment._id)
      .populate("formId", "title status startDate endDate responseMode allowMultipleResponses")
      .populate("groupId", "name status");

    return res.status(200).json({ success: true, message: "Assignment updated successfully", assignment: populated });
  } catch (error) {
    console.error("Update assignment error:", error);
    return res.status(500).json({ success: false, message: "Failed to update assignment" });
  }
};

const updateAssignmentStatus = async (req, res) => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const { status } = req.body;
    if (!["ACTIVE", "INACTIVE"].includes(status)) return res.status(400).json({ success: false, message: "Invalid assignment status" });

    const assignment = await Assignment.findOne({ _id: req.params.id, organizationId });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

    if (status === "ACTIVE") {
      const validation = await validateAssignment({
        organizationId,
        formId: assignment.formId,
        groupId: assignment.groupId,
      });
      if (validation.error) return res.status(400).json({ success: false, message: validation.error });
    }

    assignment.status = status;
    await assignment.save();
    return res.status(200).json({ success: true, message: `Assignment ${status.toLowerCase()} successfully`, assignment });
  } catch (error) {
    console.error("Update assignment status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update assignment status" });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  updateAssignmentStatus,
};
