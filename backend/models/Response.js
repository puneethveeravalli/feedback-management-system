const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },

    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      default: null,
    },

    anonymous: {
      type: Boolean,
      default: false,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED"],
      default: "SUBMITTED",
    },
  },
  {
    timestamps: true,
  }
);

responseSchema.index({
  organizationId: 1,
  assignmentId: 1,
  participantId: 1,
});

module.exports = mongoose.model("Response", responseSchema);