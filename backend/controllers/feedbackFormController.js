const FeedbackForm = require("../models/FeedbackForm");

// CREATE FORM
const createFeedbackForm = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const {
      title,
      description,
      startDate,
      endDate,
      responseMode,
      allowMultipleResponses,
      confirmationMessage,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Form title is required",
      });
    }

    // Validate dates if both are provided
    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Validate response mode
    if (
      responseMode &&
      !["ANONYMOUS", "IDENTIFIED"].includes(responseMode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid response mode",
      });
    }

    // Prevent duplicate form title
    const existingForm = await FeedbackForm.findOne({
      organizationId,
      title: title.trim(),
    });

    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "A form with this title already exists",
      });
    }

    const form = await FeedbackForm.create({
      organizationId,
      title: title.trim(),
      description: description?.trim() || "",
      startDate: startDate || null,
      endDate: endDate || null,
      responseMode: responseMode || "IDENTIFIED",
      allowMultipleResponses:
        allowMultipleResponses ?? false,
      confirmationMessage:
        confirmationMessage?.trim() ||
        "Thank you for your feedback.",
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
      message: "Server error",
    });
  }
};


// GET ALL FORMS
const getFeedbackForms = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const filter = {
      organizationId,
    };

    // Optional status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const forms = await FeedbackForm.find(filter)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: forms.length,
      forms,
    });
  } catch (error) {
    console.error("Get feedback forms error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET FORM BY ID
const getFeedbackFormById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

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
      message: "Server error",
    });
  }
};


// UPDATE FORM
const updateFeedbackForm = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const {
      title,
      description,
      startDate,
      endDate,
      responseMode,
      allowMultipleResponses,
      confirmationMessage,
    } = req.body;

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

    // Validate dates
    const newStartDate =
      startDate !== undefined
        ? startDate
          ? new Date(startDate)
          : null
        : form.startDate;

    const newEndDate =
      endDate !== undefined
        ? endDate
          ? new Date(endDate)
          : null
        : form.endDate;

    if (
      newStartDate &&
      newEndDate &&
      newEndDate <= newStartDate
    ) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    if (title !== undefined) {
      form.title = title.trim();
    }

    if (description !== undefined) {
      form.description = description.trim();
    }

    if (startDate !== undefined) {
      form.startDate = startDate || null;
    }

    if (endDate !== undefined) {
      form.endDate = endDate || null;
    }

    if (responseMode !== undefined) {
      if (
        !["ANONYMOUS", "IDENTIFIED"].includes(responseMode)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid response mode",
        });
      }

      form.responseMode = responseMode;
    }

    if (allowMultipleResponses !== undefined) {
      form.allowMultipleResponses =
        allowMultipleResponses;
    }

    if (confirmationMessage !== undefined) {
      form.confirmationMessage =
        confirmationMessage.trim();
    }

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
      message: "Server error",
    });
  }
};


// UPDATE FORM STATUS
const updateFeedbackFormStatus = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "DRAFT",
      "PUBLISHED",
      "ACTIVE",
      "CLOSED",
      "ARCHIVED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid form status",
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

    form.status = status;

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Feedback form status updated successfully",
      form,
    });
  } catch (error) {
    console.error(
      "Update feedback form status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
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