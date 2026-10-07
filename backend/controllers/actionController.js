const mongoose = require("mongoose");
const Action = require("../models/Action");
const FeedbackForm = require("../models/FeedbackForm");
const Question = require("../models/Question");
const User = require("../models/User");

const ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateDueDate = (dueDate) => {
  if (!dueDate) return { value: null };
  const value = new Date(dueDate);
  if (Number.isNaN(value.getTime())) return { error: "Invalid due date" };
  return { value };
};

const validateReferences = async ({ organizationId, formId, questionId, assignedTo }) => {
  if (formId) {
    if (!validId(formId)) return "Invalid feedback form ID";
    const form = await FeedbackForm.findOne({ _id: formId, organizationId });
    if (!form) return "Feedback form not found";
  }

  if (questionId) {
    if (!validId(questionId)) return "Invalid question ID";
    const question = await Question.findOne({
      _id: questionId,
      organizationId,
      ...(formId ? { formId } : {}),
    });
    if (!question) return "Question not found or does not belong to the selected form";
  }

  if (assignedTo) {
    if (!validId(assignedTo)) return "Invalid owner ID";
    const user = await User.findOne({
      _id: assignedTo,
      organizationId,
      status: "ACTIVE",
      role: { $in: ["ORG_ADMIN", "MANAGER"] },
    });
    if (!user) return "Owner not found or cannot be assigned actions";
  }

  return null;
};

const populateAction = (query) =>
  query
    .populate("formId", "title")
    .populate("questionId", "questionText type")
    .populate("assignedTo", "name email role");

const createAction = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const {
      issue = "",
      action = "",
      title = "",
      description = "",
      formId,
      questionId,
      assignedTo,
      priority = "MEDIUM",
      dueDate,
    } = req.body;

    const cleanIssue = String(issue || "").trim();
    const cleanAction = String(action || title || "").trim();
    const cleanDescription = String(description || "").trim();

    if (!cleanIssue) return res.status(400).json({ message: "Issue is required" });
    if (!cleanAction) return res.status(400).json({ message: "Action is required" });
    if (cleanIssue.length > 1000) return res.status(400).json({ message: "Issue cannot exceed 1000 characters" });
    if (cleanAction.length > 1000) return res.status(400).json({ message: "Action cannot exceed 1000 characters" });
    if (cleanDescription.length > 2000) return res.status(400).json({ message: "Description cannot exceed 2000 characters" });
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority" });

    const due = validateDueDate(dueDate);
    if (due.error) return res.status(400).json({ message: due.error });

    const referenceError = await validateReferences({
      organizationId,
      formId,
      questionId,
      assignedTo,
    });
    if (referenceError) return res.status(400).json({ message: referenceError });

    const created = await Action.create({
      organizationId,
      issue: cleanIssue,
      action: cleanAction,
      title: cleanAction,
      description: cleanDescription,
      formId: formId || null,
      questionId: questionId || null,
      assignedTo: assignedTo || null,
      priority,
      dueDate: due.value,
      status: "OPEN",
    });

    return res.status(201).json({
      success: true,
      message: "Improvement action created successfully",
      action: await populateAction(Action.findById(created._id)),
    });
  } catch (error) {
    console.error("Create action error:", error);
    return res.status(500).json({ message: "Failed to create action" });
  }
};

const getActions = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const filter = { organizationId };

    if (req.user.role === "MANAGER") filter.assignedTo = req.user._id;

    if (req.query.status) {
      if (!ACTION_STATUSES.includes(req.query.status)) return res.status(400).json({ message: "Invalid action status" });
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      if (!PRIORITIES.includes(req.query.priority)) return res.status(400).json({ message: "Invalid priority" });
      filter.priority = req.query.priority;
    }

    if (req.query.formId) {
      if (!validId(req.query.formId)) return res.status(400).json({ message: "Invalid form ID" });
      filter.formId = req.query.formId;
    }

    if (req.user.role === "ORG_ADMIN" && req.query.assignedTo) {
      if (!validId(req.query.assignedTo)) return res.status(400).json({ message: "Invalid owner ID" });
      filter.assignedTo = req.query.assignedTo;
    }

    const actions = await populateAction(
      Action.find(filter).sort({ createdAt: -1 })
    );

    return res.status(200).json({ success: true, count: actions.length, actions });
  } catch (error) {
    console.error("Get actions error:", error);
    return res.status(500).json({ message: "Failed to fetch actions" });
  }
};

const getActionById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid action ID" });

    const filter = { _id: req.params.id, organizationId };
    if (req.user.role === "MANAGER") filter.assignedTo = req.user._id;

    const action = await populateAction(Action.findOne(filter));
    if (!action) return res.status(404).json({ message: "Action not found" });

    return res.status(200).json({ success: true, action });
  } catch (error) {
    console.error("Get action error:", error);
    return res.status(500).json({ message: "Failed to fetch action" });
  }
};

const updateAction = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    if (!validId(id)) return res.status(400).json({ message: "Invalid action ID" });

    const actionRecord = await Action.findOne({ _id: id, organizationId });
    if (!actionRecord) return res.status(404).json({ message: "Action not found" });

    const nextIssue = req.body.issue !== undefined
      ? String(req.body.issue).trim()
      : actionRecord.issue || "";
    const nextAction = req.body.action !== undefined
      ? String(req.body.action).trim()
      : actionRecord.action || actionRecord.title || "";

    if (!nextIssue) return res.status(400).json({ message: "Issue is required" });
    if (!nextAction) return res.status(400).json({ message: "Action is required" });
    if (nextIssue.length > 1000 || nextAction.length > 1000) {
      return res.status(400).json({ message: "Issue and Action cannot exceed 1000 characters" });
    }

    if (req.body.priority !== undefined && !PRIORITIES.includes(req.body.priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const due = validateDueDate(req.body.dueDate !== undefined ? req.body.dueDate : actionRecord.dueDate);
    if (due.error) return res.status(400).json({ message: due.error });

    const referenceError = await validateReferences({
      organizationId,
      formId: req.body.formId !== undefined ? req.body.formId : actionRecord.formId,
      questionId: req.body.questionId !== undefined ? req.body.questionId : actionRecord.questionId,
      assignedTo: req.body.assignedTo !== undefined ? req.body.assignedTo : actionRecord.assignedTo,
    });
    if (referenceError) return res.status(400).json({ message: referenceError });

    actionRecord.issue = nextIssue;
    actionRecord.action = nextAction;
    actionRecord.title = nextAction;
    if (req.body.description !== undefined) actionRecord.description = String(req.body.description || "").trim();
    if (req.body.formId !== undefined) actionRecord.formId = req.body.formId || null;
    if (req.body.questionId !== undefined) actionRecord.questionId = req.body.questionId || null;
    if (req.body.assignedTo !== undefined) actionRecord.assignedTo = req.body.assignedTo || null;
    if (req.body.priority !== undefined) actionRecord.priority = req.body.priority;
    if (req.body.dueDate !== undefined) actionRecord.dueDate = due.value;

    await actionRecord.save();

    return res.status(200).json({
      success: true,
      message: "Improvement action updated successfully",
      action: await populateAction(Action.findById(actionRecord._id)),
    });
  } catch (error) {
    console.error("Update action error:", error);
    return res.status(500).json({ message: "Failed to update action" });
  }
};

const updateActionStatus = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    const { status } = req.body;

    if (!validId(id)) return res.status(400).json({ message: "Invalid action ID" });
    if (!ACTION_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid action status" });

    const filter = { _id: id, organizationId };
    if (req.user.role === "MANAGER") filter.assignedTo = req.user._id;

    const actionRecord = await Action.findOne(filter);
    if (!actionRecord) return res.status(404).json({ message: "Action not found" });

    actionRecord.status = status;
    actionRecord.completedAt = status === "COMPLETED" ? new Date() : null;
    await actionRecord.save();

    return res.status(200).json({
      success: true,
      message: "Action status updated successfully",
      action: await populateAction(Action.findById(actionRecord._id)),
    });
  } catch (error) {
    console.error("Update action status error:", error);
    return res.status(500).json({ message: "Failed to update action status" });
  }
};

module.exports = {
  createAction,
  getActions,
  getActionById,
  updateAction,
  updateActionStatus,
};
