const mongoose = require("mongoose");
const FeedbackForm = require("../models/FeedbackForm");

const ALLOWED_RESPONSE_MODES = ["ANONYMOUS", "IDENTIFIED"];

const ALLOWED_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateDates = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return {
      valid: false,
      message: "Start date and end date are required",
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      valid: false,
      message: "Invalid start date or end date",
    };
  }

  if (start >= end) {
    return {
      valid: false,
      message: "Start date must be before end date",
    };
  }

  return {
    valid: true,
    start,
    end,
  };
};

/**
 * CREATE FEEDBACK FORM
 */
const createFeedbackForm = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization is required",
      });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      responseMode,
      allowMultipleResponses,
      confirmationMessage,
    } = req.body;

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const cleanConfirmationMessage = String(
      confirmationMessage || ""
    ).trim();

    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "Form title is required",
      });
    }

    if (cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Form title cannot exceed 200 characters",
      });
    }

    if (cleanDescription.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 1000 characters",
      });
    }

    if (cleanConfirmationMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Confirmation message cannot exceed 500 characters",
      });
    }

    if (!ALLOWED_RESPONSE_MODES.includes(responseMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response mode",
      });
    }

    const dateValidation = validateDates(startDate, endDate);

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message,
      });
    }

    const existingForm = await FeedbackForm.findOne({
      organizationId,
      title: {
        $regex: `^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "A feedback form with this title already exists",
      });
    }

    const form = await FeedbackForm.create({
      organizationId,
      title: cleanTitle,
      description: cleanDescription,
      startDate: dateValidation.start,
      endDate: dateValidation.end,
      responseMode,
      allowMultipleResponses: Boolean(allowMultipleResponses),
      confirmationMessage: cleanConfirmationMessage,
      status: "DRAFT",
    });

    return res.status(201).json({
      success: true,
      message: "Feedback form created successfully",
      form,
    });
  } catch (error) {
    console.error("Create feedback form error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create feedback form",
    });
  }
};

/**
 * GET ALL FEEDBACK FORMS
 */
const getFeedbackForms = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization is required",
      });
    }

    const forms = await FeedbackForm.find({
      organizationId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      forms,
    });
  } catch (error) {
    console.error("Get feedback forms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback forms",
    });
  }
};

/**
 * GET SINGLE FEEDBACK FORM
 */
const getFeedbackFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form ID",
      });
    }

    const form = await FeedbackForm.findOne({
      _id: id,
      organizationId,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    return res.status(200).json({
      success: true,
      form,
    });
  } catch (error) {
    console.error("Get feedback form error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback form",
    });
  }
};

/**
 * UPDATE FEEDBACK FORM
 */
const updateFeedbackForm = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form ID",
      });
    }

    const form = await FeedbackForm.findOne({
      _id: id,
      organizationId,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    // Do not allow editing a form that is already closed or archived.
    if (["CLOSED", "ARCHIVED"].includes(form.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${form.status.toLowerCase()} form cannot be edited`,
      });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      responseMode,
      allowMultipleResponses,
      confirmationMessage,
    } = req.body;

    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const cleanConfirmationMessage = String(
      confirmationMessage || ""
    ).trim();

    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "Form title is required",
      });
    }

    if (cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Form title cannot exceed 200 characters",
      });
    }

    if (cleanDescription.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 1000 characters",
      });
    }

    if (cleanConfirmationMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Confirmation message cannot exceed 500 characters",
      });
    }

    if (!ALLOWED_RESPONSE_MODES.includes(responseMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response mode",
      });
    }

    const dateValidation = validateDates(startDate, endDate);

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message,
      });
    }

    const duplicateForm = await FeedbackForm.findOne({
      _id: { $ne: id },
      organizationId,
      title: {
        $regex: `^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicateForm) {
      return res.status(409).json({
        success: false,
        message: "A feedback form with this title already exists",
      });
    }

    form.title = cleanTitle;
    form.description = cleanDescription;
    form.startDate = dateValidation.start;
    form.endDate = dateValidation.end;
    form.responseMode = responseMode;
    form.allowMultipleResponses = Boolean(allowMultipleResponses);
    form.confirmationMessage = cleanConfirmationMessage;

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Feedback form updated successfully",
      form,
    });
  } catch (error) {
    console.error("Update feedback form error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update feedback form",
    });
  }
};

/**
 * UPDATE FORM STATUS
 */
const updateFeedbackFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.organizationId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form ID",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback form status",
      });
    }

    const form = await FeedbackForm.findOne({
      _id: id,
      organizationId,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    const now = new Date();

    /*
      Schedule-aware status validation.

      PUBLISHED:
      Form is configured and ready for its scheduled lifecycle.

      ACTIVE:
      Form can collect responses only when current time
      is within the configured start/end period.

      CLOSED:
      Form collection has ended.

      ARCHIVED:
      Form is retained for historical/reference purposes.
    */

    if (status === "ACTIVE") {
      if (now < new Date(form.startDate)) {
        return res.status(400).json({
          success: false,
          message: "Form cannot be activated before its start date",
        });
      }

      if (now >= new Date(form.endDate)) {
        return res.status(400).json({
          success: false,
          message: "Form cannot be activated after its end date",
        });
      }
    }

    if (status === "CLOSED" && now < new Date(form.startDate)) {
      return res.status(400).json({
        success: false,
        message: "A form cannot be closed before its start date",
      });
    }

    if (status === "PUBLISHED" && form.status === "ARCHIVED") {
      return res.status(400).json({
        success: false,
        message: "An archived form cannot be published",
      });
    }

    if (status === "ACTIVE" && form.status === "ARCHIVED") {
      return res.status(400).json({
        success: false,
        message: "An archived form cannot be activated",
      });
    }

    form.status = status;
    await form.save();

    return res.status(200).json({
      success: true,
      message: `Feedback form ${status.toLowerCase()} successfully`,
      form,
    });
  } catch (error) {
    console.error("Update feedback form status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update feedback form status",
    });
  }
};

module.exports = {
  createFeedbackForm,
  getFeedbackForms,
  getFeedbackFormById,
  updateFeedbackForm,
  updateFeedbackFormStatus,
};