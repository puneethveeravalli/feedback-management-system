const mongoose = require("mongoose");
const Response = require("../models/Response");
const Answer = require("../models/Answer");
const FeedbackForm = require("../models/FeedbackForm");
const Question = require("../models/Question");
const Assignment = require("../models/Assignment");
const Participant = require("../models/Participant");
const Action = require("../models/Action");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const idString = (value) => (value ? value.toString() : null);
const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const ratingValues = (answers) => answers.map((a) => Number(a.value)).filter((v) => Number.isFinite(v));
const average = (values) => values.length ? round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
const percentage = (value, total) => total ? round((value / total) * 100, 1) : 0;

const getLowRatingThreshold = (question) => {
  const min = Number(question.minValue ?? 1);
  const max = Number(question.maxValue ?? 5);
  return min + (max - min) * 0.4;
};

const buildQuestionAnalytics = (question, answers) => {
  const questionAnswers = answers.filter((answer) => idString(answer.questionId) === idString(question._id));
  const result = {
    questionId: question._id,
    questionText: question.questionText,
    type: question.type,
    required: question.required,
    totalAnswers: questionAnswers.length,
    average: null,
    minimum: null,
    maximum: null,
    lowRatingCount: 0,
    distribution: {},
    textResponses: [],
  };

  if (["STAR_RATING", "NUMERIC_RATING"].includes(question.type)) {
    const values = ratingValues(questionAnswers);
    result.average = average(values);
    result.minimum = values.length ? Math.min(...values) : null;
    result.maximum = values.length ? Math.max(...values) : null;
    const threshold = getLowRatingThreshold(question);
    result.lowRatingCount = values.filter((value) => value <= threshold).length;
    values.forEach((value) => {
      const key = String(value);
      result.distribution[key] = (result.distribution[key] || 0) + 1;
    });
  } else if (["MULTIPLE_CHOICE", "DROPDOWN", "YES_NO", "EMOJI"].includes(question.type)) {
    questionAnswers.forEach((answer) => {
      const value = answer.value;
      if (value !== null && value !== undefined && value !== "") {
        const key = String(value);
        result.distribution[key] = (result.distribution[key] || 0) + 1;
      }
    });
  } else if (question.type === "CHECKBOX") {
    questionAnswers.forEach((answer) => {
      const values = Array.isArray(answer.values) ? answer.values : [];
      values.forEach((value) => {
        const key = String(value);
        result.distribution[key] = (result.distribution[key] || 0) + 1;
      });
    });
  } else {
    result.textResponses = questionAnswers
      .filter((answer) => String(answer.value ?? "").trim())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)
      .map((answer) => ({ comment: String(answer.value), createdAt: answer.createdAt }));
  }

  return result;
};

const getOrganizationId = (req) => req.organizationId || null;

const getAnalyticsSummary = async (req, res) => {
  try {
    const organizationId = getOrganizationId(req);
    const filter = organizationId ? { organizationId } : {};

    const [forms, responses, questions, assignments, participants, actions, groups] = await Promise.all([
      FeedbackForm.find(filter).sort({ createdAt: -1 }).lean(),
      Response.find({ ...filter, status: "SUBMITTED" }).lean(),
      Question.find({ ...filter, status: "ACTIVE" }).sort({ order: 1 }).lean(),
      Assignment.find({ ...filter, status: "ACTIVE" }).populate("groupId", "name status").populate("formId", "title status responseMode allowMultipleResponses startDate endDate").lean(),
      Participant.find({ ...filter, status: "ACTIVE" }).select("_id groupId").lean(),
      Action.find(filter).select("status").lean(),
      require("../models/Group").find(filter).select("name status").lean(),
    ]);

    const responseIds = responses.map((r) => r._id);
    const answers = responseIds.length
      ? await Answer.find({ ...filter, responseId: { $in: responseIds } }).lean()
      : [];

    const ratingQuestionIds = new Set(
      questions.filter((q) => ["STAR_RATING", "NUMERIC_RATING"].includes(q.type)).map((q) => idString(q._id))
    );
    const overallRatings = answers.filter((a) => ratingQuestionIds.has(idString(a.questionId))).map((a) => Number(a.value)).filter(Number.isFinite);

    const participantsByGroup = {};
    participants.forEach((p) => {
      const groupId = idString(p.groupId);
      if (groupId) participantsByGroup[groupId] = (participantsByGroup[groupId] || 0) + 1;
    });

    const responseByAssignment = {};
    const responseByForm = {};
    responses.forEach((r) => {
      const assignmentId = idString(r.assignmentId);
      const formId = idString(r.formId);
      if (assignmentId) responseByAssignment[assignmentId] = (responseByAssignment[assignmentId] || 0) + 1;
      if (formId) responseByForm[formId] = (responseByForm[formId] || 0) + 1;
    });

    let eligibleParticipants = 0;
    assignments.forEach((assignment) => {
      eligibleParticipants += participantsByGroup[idString(assignment.groupId)] || 0;
    });

    const responseTrendsMap = {};
    responses.forEach((response) => {
      const date = new Date(response.submittedAt || response.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      responseTrendsMap[key] = (responseTrendsMap[key] || 0) + 1;
    });
    const responseTrends = Object.entries(responseTrendsMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, responses: count }));

    const formPerformance = forms.map((form) => {
      const formId = idString(form._id);
      const formAssignments = assignments.filter((a) => idString(a.formId?._id || a.formId) === formId);
      const eligible = formAssignments.reduce((sum, assignment) => sum + (participantsByGroup[idString(assignment.groupId)] || 0), 0);
      const responseCount = responseByForm[formId] || 0;
      return {
        formId: form._id,
        title: form.title,
        status: form.status,
        responseMode: form.responseMode,
        responses: responseCount,
        eligibleParticipants: eligible,
        responseRate: percentage(responseCount, eligible),
      };
    });

    const groupMap = {};
    assignments.forEach((assignment) => {
      const group = assignment.groupId;
      if (!group?._id) return;
      const groupId = idString(group._id);
      if (!groupMap[groupId]) {
        groupMap[groupId] = { groupId: group._id, groupName: group.name, assignments: 0, eligibleParticipants: 0, responses: 0 };
      }
      groupMap[groupId].assignments += 1;
      groupMap[groupId].eligibleParticipants += participantsByGroup[groupId] || 0;
      groupMap[groupId].responses += responseByAssignment[idString(assignment._id)] || 0;
    });
    const groupComparison = Object.values(groupMap).map((item) => ({ ...item, responseRate: percentage(item.responses, item.eligibleParticipants) }));

    const textQuestionIds = new Set(questions.filter((q) => ["SHORT_TEXT", "LONG_TEXT"].includes(q.type)).map((q) => idString(q._id)));
    const questionById = Object.fromEntries(questions.map((q) => [idString(q._id), q]));
    const recentComments = answers
      .filter((a) => textQuestionIds.has(idString(a.questionId)) && String(a.value ?? "").trim())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((a) => ({ questionId: a.questionId, questionText: questionById[idString(a.questionId)]?.questionText || "Question", comment: String(a.value), createdAt: a.createdAt }));

    const lowRatingIndicators = questions
      .filter((q) => ["STAR_RATING", "NUMERIC_RATING"].includes(q.type))
      .map((q) => buildQuestionAnalytics(q, answers))
      .filter((q) => q.lowRatingCount > 0)
      .sort((a, b) => b.lowRatingCount - a.lowRatingCount)
      .slice(0, 10);

    const actionSummary = { open: 0, inProgress: 0, completed: 0 };
    actions.forEach((a) => {
      if (a.status === "OPEN") actionSummary.open += 1;
      if (a.status === "IN_PROGRESS") actionSummary.inProgress += 1;
      if (a.status === "COMPLETED") actionSummary.completed += 1;
    });

    const groupCount = groups.length;

    return res.status(200).json({
      summary: {
        totalForms: forms.length,
        activeForms: forms.filter((f) => f.status === "ACTIVE").length,
        closedForms: forms.filter((f) => f.status === "CLOSED").length,
        totalResponses: responses.length,
        anonymousResponses: responses.filter((r) => r.anonymous).length,
        identifiedResponses: responses.filter((r) => !r.anonymous).length,
        averageRating: average(overallRatings) || 0,
        eligibleParticipants,
        participationCount: responses.length,
        participationRate: percentage(responses.length, eligibleParticipants),
        totalGroups: groupCount,
      },
      formPerformance,
      responseTrends,
      groupComparison,
      recentComments,
      lowRatingIndicators,
      actionSummary,
    });
  } catch (error) {
    console.error("Get analytics summary error:", error);
    return res.status(500).json({ message: "Failed to load analytics summary." });
  }
};

const getFormAnalytics = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.formId)) return res.status(400).json({ message: "Invalid form ID" });
    const filter = req.organizationId ? { organizationId: req.organizationId } : {};
    const form = await FeedbackForm.findOne({ _id: req.params.formId, ...filter }).lean();
    if (!form) return res.status(404).json({ message: "Feedback form not found" });

    const responses = await Response.find({ ...filter, formId: form._id, status: "SUBMITTED" }).sort({ submittedAt: -1 }).lean();
    const responseIds = responses.map((r) => r._id);
    const answers = responseIds.length ? await Answer.find({ ...filter, responseId: { $in: responseIds } }).lean() : [];
    const questions = await Question.find({ ...filter, formId: form._id, status: "ACTIVE" }).sort({ order: 1 }).lean();
    const questionAnalytics = questions.map((q) => buildQuestionAnalytics(q, answers));
    const ratingAnswers = answers.filter((a) => questions.some((q) => q._id.toString() === a.questionId.toString() && ["STAR_RATING", "NUMERIC_RATING"].includes(q.type)));
    const ratings = ratingValues(ratingAnswers);

    return res.status(200).json({
      form: {
        id: form._id,
        title: form.title,
        description: form.description,
        status: form.status,
        responseMode: form.responseMode,
        allowMultipleResponses: form.allowMultipleResponses,
      },
      summary: {
        totalResponses: responses.length,
        anonymousResponses: responses.filter((r) => r.anonymous).length,
        identifiedResponses: responses.filter((r) => !r.anonymous).length,
        averageRating: average(ratings) || 0,
      },
      questions: questionAnalytics,
      textResponses: questionAnalytics.flatMap((q) => q.textResponses.map((item) => ({ ...item, questionId: q.questionId, questionText: q.questionText }))).slice(0, 100),
    });
  } catch (error) {
    console.error("Get form analytics error:", error);
    return res.status(500).json({ message: "Failed to load form analytics" });
  }
};

const getQuestionAnalytics = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.questionId)) return res.status(400).json({ message: "Invalid question ID" });
    const filter = req.organizationId ? { organizationId: req.organizationId } : {};
    const question = await Question.findOne({ _id: req.params.questionId, ...filter }).lean();
    if (!question) return res.status(404).json({ message: "Question not found" });

    const responses = await Response.find({ ...filter, formId: question.formId, status: "SUBMITTED" }).select("_id").lean();
    const answers = responses.length ? await Answer.find({ ...filter, responseId: { $in: responses.map((r) => r._id) }, questionId: question._id }).lean() : [];
    return res.status(200).json({ question: buildQuestionAnalytics(question, answers) });
  } catch (error) {
    console.error("Get question analytics error:", error);
    return res.status(500).json({ message: "Failed to load question analytics" });
  }
};

module.exports = { getAnalyticsSummary, getFormAnalytics, getQuestionAnalytics };
