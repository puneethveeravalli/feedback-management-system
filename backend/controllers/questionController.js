const Question = require("../models/Question");
const FeedbackForm = require("../models/FeedbackForm");

const allowedQuestionTypes = [
  "STAR_RATING",
  "NUMERIC_RATING",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
  "YES_NO",
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMOJI",
];

const optionBasedTypes = [
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
];


// CREATE QUESTION
const createQuestion = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const {
      formId,
      questionText,
      type,
      options,
      required,
      order,
      minValue,
      maxValue,
    } = req.body;

    if (!formId || !questionText || !type) {
      return res.status(400).json({
        success: false,
        message: "formId, questionText and type are required",
      });
    }

    // Validate question type
    if (!allowedQuestionTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question type",
      });
    }

    // Make sure form belongs to current organization
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

    // Choice questions must have options
    if (optionBasedTypes.includes(type)) {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Options are required for this question type",
        });
      }
    }

    // Non-choice questions should not require options
    let finalOptions = [];

    if (optionBasedTypes.includes(type)) {
      finalOptions = options
        .map((option) => String(option).trim())
        .filter(Boolean);

      if (finalOptions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one valid option is required",
        });
      }
    }

    // Validate numeric rating
    if (type === "NUMERIC_RATING") {
      if (
        minValue === undefined ||
        maxValue === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "minValue and maxValue are required for numeric rating",
        });
      }

      if (Number(minValue) >= Number(maxValue)) {
        return res.status(400).json({
          success: false,
          message: "maxValue must be greater than minValue",
        });
      }
    }

    // Check duplicate order
    const existingOrder = await Question.findOne({
      organizationId,
      formId,
      order: Number(order || 1),
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "A question already exists at this order",
      });
    }

    const question = await Question.create({
      organizationId,
      formId,
      questionText: questionText.trim(),
      type,
      options: finalOptions,
      required: required ?? false,
      order: Number(order || 1),
      minValue:
        type === "NUMERIC_RATING"
          ? Number(minValue)
          : null,
      maxValue:
        type === "NUMERIC_RATING"
          ? Number(maxValue)
          : null,
    });

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      question,
    });
  } catch (error) {
    console.error("Create question error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET QUESTIONS FOR FORM
const getQuestions = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { formId } = req.params;

    // Validate form belongs to organization
    const form = await FeedbackForm.findOne({
      _id: formId,
      organizationId,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    const questions = await Question.find({
      organizationId,
      formId,
    }).sort({ order: 1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Get questions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET SINGLE QUESTION
const getQuestionById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const question = await Question.findOne({
      _id: id,
      organizationId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("Get question error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE QUESTION
const updateQuestion = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const {
      questionText,
      type,
      options,
      required,
      order,
      minValue,
      maxValue,
    } = req.body;

    const question = await Question.findOne({
      _id: id,
      organizationId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const newType =
      type !== undefined ? type : question.type;

    if (!allowedQuestionTypes.includes(newType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question type",
      });
    }

    if (questionText !== undefined) {
      question.questionText = questionText.trim();
    }

    if (type !== undefined) {
      question.type = type;
    }

    if (required !== undefined) {
      question.required = required;
    }

    if (order !== undefined) {
      question.order = Number(order);
    }

    if (optionBasedTypes.includes(newType)) {
      const newOptions =
        options !== undefined
          ? options
              .map((option) => String(option).trim())
              .filter(Boolean)
          : question.options;

      if (newOptions.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one option is required",
        });
      }

      question.options = newOptions;
    } else {
      question.options = [];
    }

    if (newType === "NUMERIC_RATING") {
      const newMin =
        minValue !== undefined
          ? Number(minValue)
          : question.minValue;

      const newMax =
        maxValue !== undefined
          ? Number(maxValue)
          : question.maxValue;

      if (
        newMin === null ||
        newMax === null ||
        newMin >= newMax
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid minValue and maxValue are required",
        });
      }

      question.minValue = newMin;
      question.maxValue = newMax;
    } else {
      question.minValue = null;
      question.maxValue = null;
    }

    await question.save();

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      question,
    });
  } catch (error) {
    console.error("Update question error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// UPDATE QUESTION STATUS
const updateQuestionStatus = async (req, res) => {
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

    const question = await Question.findOne({
      _id: id,
      organizationId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    question.status = status;

    await question.save();

    return res.status(200).json({
      success: true,
      message: "Question status updated successfully",
      question,
    });
  } catch (error) {
    console.error("Update question status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  updateQuestionStatus,
};