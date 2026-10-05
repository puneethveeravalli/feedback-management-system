const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
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

    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "STAR_RATING",
        "NUMERIC_RATING",
        "MULTIPLE_CHOICE",
        "CHECKBOX",
        "DROPDOWN",
        "YES_NO",
        "SHORT_TEXT",
        "LONG_TEXT",
        "EMOJI",
      ],
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    required: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      required: true,
      default: 1,
    },

    minValue: {
      type: Number,
      default: null,
    },

    maxValue: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({
  organizationId: 1,
  formId: 1,
  order: 1,
});

module.exports = mongoose.model("Question", questionSchema);