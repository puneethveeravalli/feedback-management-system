const crypto = require("crypto");
const mongoose = require("mongoose");

const Response = require("../models/Response");
const Answer = require("../models/Answer");
const AccessSession = require("../models/AccessSession");
const FeedbackForm = require("../models/FeedbackForm");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const validateAnswer = (question, answer) => {
  const value = answer.value;
  const values = answer.values;

  switch (question.type) {
    case "STAR_RATING":
      if (typeof value !== "number" || value < 1 || value > 5) {
        return "Star rating must be a number between 1 and 5";
      }
      break;

    case "NUMERIC_RATING":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return "Numeric rating must be a valid number";
      }
      if (question.minValue != null && value < question.minValue) {
        return `Rating must be at least ${question.minValue}`;
      }
      if (question.maxValue != null && value > question.maxValue) {
        return `Rating must be at most ${question.maxValue}`;
      }
      break;

    case "MULTIPLE_CHOICE":
    case "DROPDOWN":
      if (typeof value !== "string" || !question.options.includes(value)) {
        return `Invalid ${question.type === "DROPDOWN" ? "dropdown" : "multiple-choice"} option`;
      }
      break;

    case "CHECKBOX":
      if (!Array.isArray(values)) return "Checkbox answer must be an array";
      for (const selectedValue of values) {
        if (!question.options.includes(selectedValue)) {
          return `Invalid checkbox option: ${selectedValue}`;
        }
      }
      break;

    case "YES_NO":
      if (value !== "YES" && value !== "NO") return "Answer must be YES or NO";
      break;

    case "SHORT_TEXT":
      if (typeof value !== "string") return "Short text answer must be text";
      if (value.length > 500) return "Short text cannot exceed 500 characters";
      break;

    case "LONG_TEXT":
      if (typeof value !== "string") return "Long text answer must be text";
      if (value.length > 5000) return "Long text cannot exceed 5000 characters";
      break;

    case "EMOJI":
      if (typeof value !== "string" || !value.trim()) return "Emoji answer is required";
      break;

    default:
      return "Unsupported question type";
  }

  return null;
};

const submitResponse = async (req, res) => {
  try {
    const { assignmentId, formId, sessionToken, answers } = req.body;

    if (!assignmentId || !formId || !sessionToken || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "assignmentId, formId, sessionToken and answers are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(assignmentId) ||
      !mongoose.Types.ObjectId.isValid(formId)
    ) {
      return res.status(400).json({ message: "Invalid assignment or form ID" });
    }

    const session = await AccessSession.findOne({
      tokenHash: hashToken(sessionToken),
    }).populate("credentialId");

    if (!session) {
      return res.status(401).json({ message: "Your access session is invalid or has expired" });
    }

    if (new Date() > new Date(session.expiresAt)) {
      await AccessSession.deleteOne({ _id: session._id });
      return res.status(401).json({
        message: "Your access session has expired. Please access the form again.",
      });
    }

    const credential = session.credentialId;
    if (!credential || credential.status === "REVOKED" || credential.status === "EXPIRED") {
      await AccessSession.deleteOne({ _id: session._id });
      return res.status(401).json({ message: "Your access credential is no longer valid" });
    }

    if (credential.assignmentId.toString() !== assignmentId) {
      return res.status(403).json({ message: "Invalid access credential" });
    }

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      organizationId: session.organizationId,
      status: "ACTIVE",
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found or inactive" });
    }

    if (assignment.formId.toString() !== formId) {
      return res.status(403).json({ message: "Form does not belong to this assignment" });
    }

    const form = await FeedbackForm.findOne({
      _id: formId,
      organizationId: session.organizationId,
    });

    if (!form) return res.status(404).json({ message: "Feedback form not found" });

    if (!["PUBLISHED", "ACTIVE"].includes(form.status)) {
      return res.status(403).json({ message: "Feedback form is not available" });
    }

    const now = new Date();
    if (form.startDate && now < new Date(form.startDate)) {
      return res.status(403).json({ message: "Feedback form has not started yet" });
    }
    if (form.endDate && now > new Date(form.endDate)) {
      return res.status(403).json({ message: "Feedback form has closed" });
    }

    /* For identified credentials the participant is carried by the session.
       Anonymous responses deliberately discard participant identity. */
    if (session.participantId) {
      const Participant = require("../models/Participant");
      const participant = await Participant.findOne({
        _id: session.participantId,
        organizationId: session.organizationId,
        status: "ACTIVE",
      });

      if (!participant) {
        return res.status(403).json({ message: "Participant is not active" });
      }

      if (!participant.groupId || participant.groupId.toString() !== assignment.groupId.toString()) {
        return res.status(403).json({ message: "Participant is not eligible for this assignment" });
      }
    }

    /*
     * A shared anonymous GROUP credential cannot determine which
     * participant has already submitted. Do not lock the shared
     * credential after the first anonymous submission.
     *
     * Individual credentials and LOGIN credentials retain normal
     * one-response enforcement.
     */
    const sharedAnonymousGroupAccess =
      credential.scopeType === "GROUP" &&
      form.responseMode === "ANONYMOUS";

    if (!form.allowMultipleResponses && !sharedAnonymousGroupAccess) {
      const existingResponse = await Response.findOne({
        credentialId: credential._id,
        status: "SUBMITTED",
      });

      if (existingResponse) {
        return res.status(409).json({
          message: "You have already submitted this feedback",
        });
      }
    }

    const questions = await Question.find({
      organizationId: session.organizationId,
      formId,
      status: "ACTIVE",
    }).sort({ order: 1 });

    if (!questions.length) {
      return res.status(400).json({ message: "This feedback form has no active questions" });
    }

    const questionMap = new Map(
      questions.map((question) => [question._id.toString(), question])
    );

    const seenQuestionIds = new Set();

    for (const submittedAnswer of answers) {
      if (!submittedAnswer.questionId) {
        return res.status(400).json({ message: "Every answer must contain questionId" });
      }

      const questionId = submittedAnswer.questionId.toString();
      if (seenQuestionIds.has(questionId)) {
        return res.status(400).json({ message: "A question cannot be answered more than once" });
      }
      seenQuestionIds.add(questionId);

      const question = questionMap.get(questionId);
      if (!question) {
        return res.status(400).json({ message: `Invalid question: ${questionId}` });
      }

      const validationError = validateAnswer(question, submittedAnswer);
      if (validationError) {
        return res.status(400).json({
          message: validationError,
          questionId: question._id,
        });
      }
    }

    for (const question of questions) {
      if (!question.required) continue;

      const submittedAnswer = answers.find(
        (answer) => answer.questionId?.toString() === question._id.toString()
      );

      if (!submittedAnswer) {
        return res.status(400).json({
          message: `Required question not answered: ${question.questionText}`,
        });
      }

      const hasValue =
        (submittedAnswer.value !== undefined &&
          submittedAnswer.value !== null &&
          submittedAnswer.value !== "") ||
        (Array.isArray(submittedAnswer.values) && submittedAnswer.values.length > 0);

      if (!hasValue) {
        return res.status(400).json({
          message: `Required question not answered: ${question.questionText}`,
        });
      }
    }

    const anonymous = form.responseMode === "ANONYMOUS";

    const response = await Response.create({
      organizationId: session.organizationId,
      assignmentId: assignment._id,
      formId: form._id,
      credentialId: credential._id,
      participantId: anonymous ? null : session.participantId || null,
      anonymous,
      submittedAt: new Date(),
      status: "SUBMITTED",
    });

    await Answer.insertMany(
      answers.map((answer) => ({
        organizationId: session.organizationId,
        responseId: response._id,
        questionId: answer.questionId,
        value: answer.value !== undefined ? answer.value : null,
        values: Array.isArray(answer.values) ? answer.values : [],
      }))
    );

    await AccessSession.deleteOne({ _id: session._id });

    if (
      !form.allowMultipleResponses &&
      !sharedAnonymousGroupAccess
    ) {
      credential.status = "USED";
      await credential.save();
    } else {
      credential.lastUsedAt = new Date();
      await credential.save();
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      response: {
        id: response._id,
        formId: response.formId,
        assignmentId: response.assignmentId,
        anonymous: response.anonymous,
        submittedAt: response.submittedAt,
        status: response.status,
      },
      confirmationMessage: form.confirmationMessage,
    });
  } catch (error) {
    console.error("Submit response error:", error);
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
};

const getResponseById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid response ID" });
    }

    const response = await Response.findOne({
      _id: id,
      organizationId,
    })
      .populate("formId", "title")
      .populate("assignmentId", "groupId")
      .populate("participantId", "name email");

    if (!response) return res.status(404).json({ message: "Response not found" });

    const safeResponse = response.toObject();
    if (safeResponse.anonymous) delete safeResponse.participantId;

    const answers = await Answer.find({
      responseId: response._id,
      organizationId,
    }).populate("questionId", "questionText type order");

    return res.status(200).json({ response: safeResponse, answers });
  } catch (error) {
    console.error("Get response error:", error);
    return res.status(500).json({ message: "Failed to fetch response" });
  }
};

const getFormResponses = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { formId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }

    const responses = await Response.find({
      formId,
      organizationId,
      status: "SUBMITTED",
    })
      .populate("participantId", "name email")
      .sort({ submittedAt: -1 });

    const safeResponses = responses.map((response) => {
      const item = response.toObject();
      if (item.anonymous) delete item.participantId;
      return item;
    });

    return res.status(200).json({
      count: safeResponses.length,
      responses: safeResponses,
    });
  } catch (error) {
    console.error("Get form responses error:", error);
    return res.status(500).json({ message: "Failed to fetch form responses" });
  }
};

module.exports = {
  submitResponse,
  getResponseById,
  getFormResponses,
};
