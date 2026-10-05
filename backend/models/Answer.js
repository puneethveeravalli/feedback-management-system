const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    responseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Response",
      required: true,
    },

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // Used for rating, yes/no, dropdown, etc.
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Used when the answer contains multiple selected options
    values: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

answerSchema.index({
  organizationId: 1,
  responseId: 1,
  questionId: 1,
});

module.exports = mongoose.model("Answer", answerSchema);