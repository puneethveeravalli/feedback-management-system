const Response = require("../models/Response");
const Answer = require("../models/Answer");
const FeedbackForm = require("../models/FeedbackForm");
const Assignment = require("../models/Assignment");
const Question = require("../models/Question");
const Participant = require("../models/Participant");

const submitResponse = async (req, res) => {
  try {
    const {
      assignmentId,
      participantId,
      answers,
    } = req.body;

    const organizationId = req.user?.organizationId || null;

    // 1. Validate input
    if (!assignmentId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "assignmentId and answers array are required",
      });
    }

    // 2. Find assignment
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      ...(organizationId ? { organizationId } : {}),
      status: "ACTIVE",
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found or inactive",
      });
    }

    // 3. Find form
    const form = await FeedbackForm.findOne({
      _id: assignment.formId,
      organizationId: assignment.organizationId,
    });

    if (!form) {
      return res.status(404).json({
        message: "Feedback form not found",
      });
    }

    // 4. Check form status
    if (!["PUBLISHED", "ACTIVE"].includes(form.status)) {
      return res.status(403).json({
        message: "Feedback form is not available",
      });
    }

    // 5. Check dates
    const now = new Date();

    if (form.startDate && now < new Date(form.startDate)) {
      return res.status(403).json({
        message: "Feedback form has not started yet",
      });
    }

    if (form.endDate && now > new Date(form.endDate)) {
      return res.status(403).json({
        message: "Feedback form has closed",
      });
    }

    // 6. Determine anonymous mode
    const anonymous = form.responseMode === "ANONYMOUS";

    // 7. Validate participant for identified response
    let participant = null;

    if (!anonymous) {
      if (!participantId) {
        return res.status(400).json({
          message: "participantId is required for identified feedback",
        });
      }

      participant = await Participant.findOne({
        _id: participantId,
        organizationId: assignment.organizationId,
        groupId: assignment.groupId,
        status: "ACTIVE",
      });

      if (!participant) {
        return res.status(403).json({
          message: "Participant is not eligible for this assignment",
        });
      }
    }

    // 8. Prevent duplicate response
    if (!form.allowMultipleResponses) {
      const duplicateQuery = {
        organizationId: assignment.organizationId,
        assignmentId: assignment._id,
        status: "SUBMITTED",
      };

      if (anonymous) {
        // For anonymous mode, use the participant eligibility
        // information only to prevent repeated submission.
        if (participantId) {
          duplicateQuery.participantId = participantId;
        }
      } else {
        duplicateQuery.participantId = participantId;
      }

      if (duplicateQuery.participantId) {
        const existingResponse = await Response.findOne(
          duplicateQuery
        );

        if (existingResponse) {
          return res.status(409).json({
            message: "You have already submitted this feedback",
          });
        }
      }
    }

    // 9. Get active questions
    const questions = await Question.find({
      organizationId: assignment.organizationId,
      formId: form._id,
      status: "ACTIVE",
    }).sort({ order: 1 });

    if (!questions.length) {
      return res.status(400).json({
        message: "This feedback form has no active questions",
      });
    }

    // 10. Validate question IDs
    const questionMap = new Map();

    questions.forEach((question) => {
      questionMap.set(question._id.toString(), question);
    });

    for (const submittedAnswer of answers) {
      if (!submittedAnswer.questionId) {
        return res.status(400).json({
          message: "Every answer must contain questionId",
        });
      }

      const question = questionMap.get(
        submittedAnswer.questionId.toString()
      );

      if (!question) {
        return res.status(400).json({
          message: `Invalid question: ${submittedAnswer.questionId}`,
        });
      }
    }

    // 11. Validate required questions
    for (const question of questions) {
      if (!question.required) {
        continue;
      }

      const submittedAnswer = answers.find(
        (answer) =>
          answer.questionId.toString() === question._id.toString()
      );

      if (!submittedAnswer) {
        return res.status(400).json({
          message: `Required question not answered: ${question.questionText}`,
        });
      }

      const hasValue =
        submittedAnswer.value !== undefined &&
        submittedAnswer.value !== null &&
        submittedAnswer.value !== "" ||
        Array.isArray(submittedAnswer.values) &&
        submittedAnswer.values.length > 0;

      if (!hasValue) {
        return res.status(400).json({
          message: `Required question not answered: ${question.questionText}`,
        });
      }
    }

    // 12. Create response
    const response = await Response.create({
      organizationId: assignment.organizationId,
      assignmentId: assignment._id,
      formId: form._id,
      participantId: anonymous ? null : participantId,
      anonymous,
      submittedAt: new Date(),
      status: "SUBMITTED",
    });

    // 13. Create answers
    const answerDocuments = answers.map((answer) => ({
      organizationId: assignment.organizationId,
      responseId: response._id,
      questionId: answer.questionId,
      value:
        answer.value !== undefined
          ? answer.value
          : null,
      values:
        Array.isArray(answer.values)
          ? answer.values
          : [],
    }));

    await Answer.insertMany(answerDocuments);

    // 14. Return result
    res.status(201).json({
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

    res.status(500).json({
      message: "Server error",
    });
  }
};


// Get response by ID
const getResponseById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const response = await Response.findOne({
      _id: req.params.id,
      organizationId,
    })
      .populate("formId", "title")
      .populate("assignmentId", "groupId targetId")
      .populate("participantId", "name email");

    if (!response) {
      return res.status(404).json({
        message: "Response not found",
      });
    }

    const answers = await Answer.find({
      responseId: response._id,
      organizationId,
    }).populate(
      "questionId",
      "questionText type order"
    );

    res.status(200).json({
      response,
      answers,
    });
  } catch (error) {
    console.error("Get response error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// Get responses for a form
const getFormResponses = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const responses = await Response.find({
      formId: req.params.formId,
      organizationId,
      status: "SUBMITTED",
    })
      .populate("participantId", "name email")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      count: responses.length,
      responses,
    });
  } catch (error) {
    console.error("Get form responses error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


module.exports = {
  submitResponse,
  getResponseById,
  getFormResponses,
};