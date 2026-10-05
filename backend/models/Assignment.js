const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Target",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({
  organizationId: 1,
  formId: 1,
  groupId: 1,
  targetId: 1,
});

module.exports = mongoose.model("Assignment", assignmentSchema);