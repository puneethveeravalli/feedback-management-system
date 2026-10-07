const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      default: null,
      index: true,
    },

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
      index: true,
    },

    // Requirements use Issue + Action. title is retained for old records.
    issue: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    action: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Backward-compatible field for existing records.
    title: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Action", actionSchema);
