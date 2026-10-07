const mongoose = require("mongoose");

const questionSchema =
  new mongoose.Schema(
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
        required: true,
        index: true,
      },

      questionText: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
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
        min: 1,
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
        enum: [
          "ACTIVE",
          "INACTIVE",
        ],
        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * Used for efficient retrieval of questions
 * belonging to a form in display order.
 *
 * Duplicate order is additionally checked
 * in the controller so existing databases
 * are not broken by a new unique index.
 */
questionSchema.index({
  organizationId: 1,
  formId: 1,
  order: 1,
});

module.exports =
  mongoose.model(
    "Question",
    questionSchema
  );