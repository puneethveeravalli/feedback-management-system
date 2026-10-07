const mongoose = require("mongoose");

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

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const isNonEmptyString = (value) => {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
};

const cleanOptions = (options) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) =>
      String(option).trim()
    )
    .filter(Boolean);
};

const hasDuplicateOptions = (
  options
) => {
  const normalized = options.map(
    (option) =>
      option.toLowerCase()
  );

  return (
    new Set(normalized).size !==
    normalized.length
  );
};

/**
 * CREATE QUESTION
 */
const createQuestion = async (
  req,
  res
) => {
  try {
    const organizationId =
      req.organizationId;

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

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Organization is required",
      });
    }

    if (!formId) {
      return res.status(400).json({
        success: false,
        message:
          "formId is required",
      });
    }

    if (
      !isValidObjectId(formId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid feedback form ID",
      });
    }

    if (
      !isNonEmptyString(
        questionText
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question text is required",
      });
    }

    const cleanQuestionText =
      questionText.trim();

    if (
      cleanQuestionText.length >
      500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question text cannot exceed 500 characters",
      });
    }

    if (
      !allowedQuestionTypes.includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid question type",
      });
    }

    /**
     * FORM VALIDATION
     */
    const form =
      await FeedbackForm.findOne({
        _id: formId,
        organizationId,
      });

    if (!form) {
      return res.status(404).json({
        success: false,
        message:
          "Feedback form not found",
      });
    }

    /**
     * Do not modify forms that are
     * already closed or archived.
     */
    if (
      form.status === "CLOSED" ||
      form.status === "ARCHIVED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Questions cannot be added to a closed or archived form",
      });
    }

    /**
     * ORDER VALIDATION
     */
    const numericOrder =
      Number(order);

    if (
      !Number.isInteger(
        numericOrder
      ) ||
      numericOrder < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order must be a whole number greater than 0",
      });
    }

    /**
     * OPTION VALIDATION
     */
    let finalOptions = [];

    if (
      optionBasedTypes.includes(
        type
      )
    ) {
      finalOptions =
        cleanOptions(options);

      if (
        finalOptions.length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least two options are required for this question type",
        });
      }

      if (
        finalOptions.some(
          (option) =>
            option.length > 200
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each option cannot exceed 200 characters",
        });
      }

      if (
        hasDuplicateOptions(
          finalOptions
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Options must be unique",
        });
      }
    }

    /**
     * NUMERIC RATING
     */
    let finalMinValue = null;
    let finalMaxValue = null;

    if (
      type === "NUMERIC_RATING"
    ) {
      const numericMin =
        Number(minValue);

      const numericMax =
        Number(maxValue);

      if (
        !Number.isFinite(
          numericMin
        ) ||
        !Number.isFinite(
          numericMax
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid minimum and maximum values are required",
        });
      }

      if (
        numericMin >=
        numericMax
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum value must be greater than minimum value",
        });
      }

      finalMinValue =
        numericMin;

      finalMaxValue =
        numericMax;
    }

    /**
     * STAR RATING
     *
     * Requirements support Star Rating.
     * We standardize it to 1–5.
     */
    if (
      type === "STAR_RATING"
    ) {
      finalMinValue = 1;
      finalMaxValue = 5;
    }

    /**
     * DUPLICATE ORDER
     */
    const existingOrder =
      await Question.findOne({
        organizationId,
        formId,
        order: numericOrder,
      });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message:
          "A question already exists at this display order",
      });
    }

    /**
     * CREATE
     */
    const question =
      await Question.create({
        organizationId,
        formId,
        questionText:
          cleanQuestionText,
        type,
        options: finalOptions,
        required:
          required === true ||
          required === "true",
        order: numericOrder,
        minValue:
          finalMinValue,
        maxValue:
          finalMaxValue,
        status: "ACTIVE",
      });

    return res.status(201).json({
      success: true,
      message:
        "Question created successfully",
      question,
    });
  } catch (error) {
    console.error(
      "Create question error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create question",
    });
  }
};

/**
 * GET QUESTIONS FOR FORM
 */
const getQuestions = async (
  req,
  res
) => {
  try {
    const organizationId =
      req.organizationId;

    const { formId } =
      req.params;

    if (
      !isValidObjectId(formId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid feedback form ID",
      });
    }

    const form =
      await FeedbackForm.findOne({
        _id: formId,
        organizationId,
      });

    if (!form) {
      return res.status(404).json({
        success: false,
        message:
          "Feedback form not found",
      });
    }

    const questions =
      await Question.find({
        organizationId,
        formId,
      }).sort({
        order: 1,
      });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error(
      "Get questions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch questions",
    });
  }
};

/**
 * GET SINGLE QUESTION
 */
const getQuestionById = async (
  req,
  res
) => {
  try {
    const organizationId =
      req.organizationId;

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid question ID",
      });
    }

    const question =
      await Question.findOne({
        _id: id,
        organizationId,
      });

    if (!question) {
      return res.status(404).json({
        success: false,
        message:
          "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    console.error(
      "Get question error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch question",
    });
  }
};

/**
 * UPDATE QUESTION
 */
const updateQuestion = async (
  req,
  res
) => {
  try {
    const organizationId =
      req.organizationId;

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid question ID",
      });
    }

    const question =
      await Question.findOne({
        _id: id,
        organizationId,
      });

    if (!question) {
      return res.status(404).json({
        success: false,
        message:
          "Question not found",
      });
    }

    /**
     * FORM OWNERSHIP
     */
    const form =
      await FeedbackForm.findOne({
        _id: question.formId,
        organizationId,
      });

    if (!form) {
      return res.status(404).json({
        success: false,
        message:
          "Feedback form not found",
      });
    }

    /**
     * CLOSED / ARCHIVED
     */
    if (
      form.status === "CLOSED" ||
      form.status === "ARCHIVED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Questions cannot be edited for a closed or archived form",
      });
    }

    const {
      questionText,
      type,
      options,
      required,
      order,
      minValue,
      maxValue,
    } = req.body;

    /**
     * DETERMINE FINAL VALUES
     */
    const newType =
      type !== undefined
        ? type
        : question.type;

    const newQuestionText =
      questionText !== undefined
        ? String(
            questionText
          ).trim()
        : question.questionText;

    const newOrder =
      order !== undefined
        ? Number(order)
        : question.order;

    /**
     * QUESTION TEXT
     */
    if (
      !isNonEmptyString(
        newQuestionText
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question text is required",
      });
    }

    if (
      newQuestionText.length >
      500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question text cannot exceed 500 characters",
      });
    }

    /**
     * TYPE
     */
    if (
      !allowedQuestionTypes.includes(
        newType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid question type",
      });
    }

    /**
     * ORDER
     */
    if (
      !Number.isInteger(
        newOrder
      ) ||
      newOrder < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order must be a whole number greater than 0",
      });
    }

    /**
     * DUPLICATE ORDER
     */
    const duplicateOrder =
      await Question.findOne({
        organizationId,
        formId:
          question.formId,
        order: newOrder,
        _id: {
          $ne: question._id,
        },
      });

    if (duplicateOrder) {
      return res.status(409).json({
        success: false,
        message:
          "A question already exists at this display order",
      });
    }

    /**
     * OPTIONS
     */
    let finalOptions = [];

    if (
      optionBasedTypes.includes(
        newType
      )
    ) {
      if (
        options === undefined
      ) {
        finalOptions =
          question.options || [];
      } else {
        finalOptions =
          cleanOptions(options);
      }

      if (
        finalOptions.length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least two options are required for this question type",
        });
      }

      if (
        finalOptions.some(
          (option) =>
            option.length > 200
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each option cannot exceed 200 characters",
        });
      }

      if (
        hasDuplicateOptions(
          finalOptions
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Options must be unique",
        });
      }
    }

    /**
     * NUMERIC RATING
     */
    let finalMinValue = null;
    let finalMaxValue = null;

    if (
      newType ===
      "NUMERIC_RATING"
    ) {
      const newMin =
        minValue !== undefined
          ? Number(minValue)
          : question.minValue;

      const newMax =
        maxValue !== undefined
          ? Number(maxValue)
          : question.maxValue;

      if (
        !Number.isFinite(
          newMin
        ) ||
        !Number.isFinite(
          newMax
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid minimum and maximum values are required",
        });
      }

      if (
        newMin >= newMax
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum value must be greater than minimum value",
        });
      }

      finalMinValue =
        newMin;

      finalMaxValue =
        newMax;
    }

    /**
     * STAR RATING
     */
    if (
      newType ===
      "STAR_RATING"
    ) {
      finalMinValue = 1;
      finalMaxValue = 5;
    }

    /**
     * SAVE
     */
    question.questionText =
      newQuestionText;

    question.type =
      newType;

    question.options =
      finalOptions;

    question.required =
      required !== undefined
        ? Boolean(required)
        : question.required;

    question.order =
      newOrder;

    question.minValue =
      finalMinValue;

    question.maxValue =
      finalMaxValue;

    await question.save();

    return res.status(200).json({
      success: true,
      message:
        "Question updated successfully",
      question,
    });
  } catch (error) {
    console.error(
      "Update question error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update question",
    });
  }
};

/**
 * UPDATE QUESTION STATUS
 */
const updateQuestionStatus =
  async (req, res) => {
    try {
      const organizationId =
        req.organizationId;

      const { id } =
        req.params;

      const { status } =
        req.body;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid question ID",
        });
      }

      if (
        !["ACTIVE", "INACTIVE"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be ACTIVE or INACTIVE",
        });
      }

      const question =
        await Question.findOne({
          _id: id,
          organizationId,
        });

      if (!question) {
        return res.status(404).json({
          success: false,
          message:
            "Question not found",
        });
      }

      /**
       * FORM OWNERSHIP / LIFECYCLE
       */
      const form =
        await FeedbackForm.findOne({
          _id: question.formId,
          organizationId,
        });

      if (!form) {
        return res.status(404).json({
          success: false,
          message:
            "Feedback form not found",
        });
      }

      if (
        form.status === "CLOSED" ||
        form.status === "ARCHIVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Question status cannot be changed for a closed or archived form",
        });
      }

      question.status =
        status;

      await question.save();

      return res.status(200).json({
        success: true,
        message:
          "Question status updated successfully",
        question,
      });
    } catch (error) {
      console.error(
        "Update question status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update question status",
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