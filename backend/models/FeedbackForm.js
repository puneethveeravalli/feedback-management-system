const mongoose = require("mongoose");

const feedbackFormSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    responseMode: {
      type: String,
      enum: ["ANONYMOUS", "IDENTIFIED"],
      default: "IDENTIFIED",
    },

    allowMultipleResponses: {
      type: Boolean,
      default: false,
    },

    confirmationMessage: {
      type: String,
      trim: true,
      default: "Thank you for your feedback.",
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "PUBLISHED",
        "ACTIVE",
        "CLOSED",
        "ARCHIVED",
      ],
      default: "DRAFT",
    },
  },
  {
    timestamps: true,
  }
);

feedbackFormSchema.index({
  organizationId: 1,
  title: 1,
});

module.exports = mongoose.model(
  "FeedbackForm",
  feedbackFormSchema
);