const mongoose = require("mongoose");
const Response = require("../models/Response");
const Answer = require("../models/Answer");
const FeedbackForm = require("../models/FeedbackForm");
const Question = require("../models/Question");
const Assignment = require("../models/Assignment");
const Group = require("../models/Group");
const Participant = require("../models/Participant");

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const idString = (value) => (value ? value.toString() : null);
const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));
const percent = (value, total) => total ? round((value / total) * 100, 1) : 0;

const getRatingValues = (answers, questionIds) => answers
  .filter((a) => questionIds.has(idString(a.questionId)))
  .map((a) => Number(a.value))
  .filter(Number.isFinite);

const ratingSummary = (values) => ({
  average: values.length ? round(values.reduce((sum, v) => sum + v, 0) / values.length) : null,
  minimum: values.length ? Math.min(...values) : null,
  maximum: values.length ? Math.max(...values) : null,
});

const questionResult = (question, answers) => {
  const list = answers.filter((a) => idString(a.questionId) === idString(question._id));
  const result = {
    questionId: question._id,
    questionText: question.questionText,
    type: question.type,
    required: question.required,
    totalAnswers: list.length,
    distribution: {},
    average: null,
    minimum: null,
    maximum: null,
    textResponses: [],
  };

  if (["STAR_RATING", "NUMERIC_RATING"].includes(question.type)) {
    const values = list.map((a) => Number(a.value)).filter(Number.isFinite);
    Object.assign(result, ratingSummary(values));
    values.forEach((value) => {
      const key = String(value);
      result.distribution[key] = (result.distribution[key] || 0) + 1;
    });
  } else if (question.type === "CHECKBOX") {
    list.forEach((a) => (Array.isArray(a.values) ? a.values : []).forEach((value) => {
      const key = String(value);
      result.distribution[key] = (result.distribution[key] || 0) + 1;
    }));
  } else if (["MULTIPLE_CHOICE", "DROPDOWN", "YES_NO", "EMOJI"].includes(question.type)) {
    list.forEach((a) => {
      if (a.value !== null && a.value !== undefined && a.value !== "") {
        const key = String(a.value);
        result.distribution[key] = (result.distribution[key] || 0) + 1;
      }
    });
  } else {
    result.textResponses = list
      .filter((a) => String(a.value ?? "").trim())
      .map((a) => ({ comment: String(a.value), createdAt: a.createdAt }));
  }

  return result;
};

const getFormData = async (formId, organizationId) => {
  const scope = organizationId ? { organizationId } : {};
  const form = await FeedbackForm.findOne({ _id: formId, ...scope }).lean();
  if (!form) return null;
  const responses = await Response.find({ ...scope, formId, status: "SUBMITTED" }).lean();
  const answers = responses.length ? await Answer.find({ ...scope, responseId: { $in: responses.map((r) => r._id) } }).lean() : [];
  const questions = await Question.find({ ...scope, formId, status: "ACTIVE" }).sort({ order: 1 }).lean();
  return { form, responses, answers, questions };
};

const getFormReport = async (req, res) => {
  try {
    if (!validId(req.params.formId)) return res.status(400).json({ message: "Invalid form ID" });
    const data = await getFormData(req.params.formId, req.organizationId);
    if (!data) return res.status(404).json({ message: "Feedback form not found" });

    const { form, responses, answers, questions } = data;
    const ratingQuestionIds = new Set(questions.filter((q) => ["STAR_RATING", "NUMERIC_RATING"].includes(q.type)).map((q) => idString(q._id)));
    const ratings = getRatingValues(answers, ratingQuestionIds);

    return res.status(200).json({
      generatedAt: new Date(),
      form: { id: form._id, title: form.title, status: form.status, responseMode: form.responseMode, startDate: form.startDate, endDate: form.endDate },
      summary: {
        totalResponses: responses.length,
        anonymousResponses: responses.filter((r) => r.anonymous).length,
        identifiedResponses: responses.filter((r) => !r.anonymous).length,
        averageRating: ratingSummary(ratings).average || 0,
        minimum: ratingSummary(ratings).minimum,
        maximum: ratingSummary(ratings).maximum,
      },
      questions: questions.map((q) => questionResult(q, answers)),
    });
  } catch (error) {
    console.error("Get form report error:", error);
    return res.status(500).json({ message: "Failed to generate form report" });
  }
};

const getGroupReport = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const scope = req.organizationId ? { organizationId: req.organizationId } : {};
    const group = await Group.findOne({ _id: req.params.groupId, ...scope }).lean();
    if (!group) return res.status(404).json({ message: "Group not found" });

    const assignments = await Assignment.find({ ...scope, groupId: group._id }).populate("formId", "title status").lean();
    const assignmentIds = assignments.map((a) => a._id);
    const responses = assignmentIds.length ? await Response.find({ ...scope, assignmentId: { $in: assignmentIds }, status: "SUBMITTED" }).lean() : [];
    const participants = await Participant.countDocuments({ ...scope, groupId: group._id, status: "ACTIVE" });

    return res.status(200).json({
      generatedAt: new Date(),
      group: { id: group._id, name: group.name, status: group.status },
      summary: {
        assignments: assignments.length,
        activeParticipants: participants,
        responses: responses.length,
        responseRate: percent(responses.length, participants * Math.max(assignments.length, 1)),
      },
      assignments: assignments.map((a) => ({ assignmentId: a._id, formId: a.formId?._id, formTitle: a.formId?.title, status: a.status, responses: responses.filter((r) => idString(r.assignmentId) === idString(a._id)).length })),
    });
  } catch (error) {
    console.error("Get group report error:", error);
    return res.status(500).json({ message: "Failed to generate group report" });
  }
};

const getQuestionReport = async (req, res) => {
  try {
    if (!validId(req.params.questionId)) return res.status(400).json({ message: "Invalid question ID" });
    const scope = req.organizationId ? { organizationId: req.organizationId } : {};
    const question = await Question.findOne({ _id: req.params.questionId, ...scope }).populate("formId", "title status").lean();
    if (!question) return res.status(404).json({ message: "Question not found" });
    const responses = await Response.find({ ...scope, formId: question.formId._id || question.formId, status: "SUBMITTED" }).select("_id").lean();
    const answers = responses.length ? await Answer.find({ ...scope, responseId: { $in: responses.map((r) => r._id) }, questionId: question._id }).lean() : [];
    const result = questionResult(question, answers);
    return res.status(200).json({
      generatedAt: new Date(),
      question: { id: question._id, questionText: question.questionText, type: question.type, required: question.required, formTitle: question.formId?.title || "" },
      summary: result,
    });
  } catch (error) {
    console.error("Get question report error:", error);
    return res.status(500).json({ message: "Failed to generate question report" });
  }
};

const getPeriodReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate are required" });
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return res.status(400).json({ message: "Invalid reporting period" });

    const scope = req.organizationId ? { organizationId: req.organizationId } : {};
    const responses = await Response.find({ ...scope, status: "SUBMITTED", submittedAt: { $gte: start, $lte: end } }).lean();
    const forms = await FeedbackForm.find(scope).select("_id title").lean();
    const formMap = Object.fromEntries(forms.map((f) => [idString(f._id), f.title]));

    const daily = {};
    responses.forEach((r) => {
      const key = new Date(r.submittedAt).toISOString().slice(0, 10);
      daily[key] = (daily[key] || 0) + 1;
    });

    return res.status(200).json({
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: { totalResponses: responses.length, anonymousResponses: responses.filter((r) => r.anonymous).length, identifiedResponses: responses.filter((r) => !r.anonymous).length },
      forms: Object.entries(responses.reduce((map, r) => {
        const key = idString(r.formId);
        map[key] = (map[key] || 0) + 1;
        return map;
      }, {})).map(([formId, responsesCount]) => ({ formId, formTitle: formMap[formId] || "Form", responses: responsesCount })),
      daily: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, responsesCount]) => ({ date, responses: responsesCount })),
    });
  } catch (error) {
    console.error("Get period report error:", error);
    return res.status(500).json({ message: "Failed to generate period report" });
  }
};

const getParticipationReport = async (req, res) => {
  try {
    const scope = req.organizationId ? { organizationId: req.organizationId } : {};
    const [participants, assignments, responses] = await Promise.all([
      Participant.find({ ...scope, status: "ACTIVE" }).select("_id groupId").lean(),
      Assignment.find({ ...scope, status: "ACTIVE" }).populate("groupId", "name").populate("formId", "title").lean(),
      Response.find({ ...scope, status: "SUBMITTED" }).lean(),
    ]);

    const groupMap = {};
    participants.forEach((p) => {
      const groupId = idString(p.groupId);
      if (!groupId) return;
      groupMap[groupId] = groupMap[groupId] || { groupId, groupName: "Group", participants: 0, responses: 0 };
      groupMap[groupId].participants += 1;
    });
    assignments.forEach((a) => {
      const groupId = idString(a.groupId?._id || a.groupId);
      if (!groupId) return;
      groupMap[groupId] = groupMap[groupId] || { groupId, groupName: a.groupId?.name || "Group", participants: 0, responses: 0 };
      groupMap[groupId].groupName = a.groupId?.name || groupMap[groupId].groupName;
      groupMap[groupId].responses += responses.filter((r) => idString(r.assignmentId) === idString(a._id)).length;
    });

    const groups = Object.values(groupMap).map((item) => ({ ...item, participationRate: percent(item.responses, item.participants) }));
    return res.status(200).json({ generatedAt: new Date(), summary: { totalParticipants: participants.length, totalAssignments: assignments.length, totalResponses: responses.length }, groups });
  } catch (error) {
    console.error("Get participation report error:", error);
    return res.status(500).json({ message: "Failed to generate participation report" });
  }
};

const getCommentsReport = async (req, res) => {
  try {
    const scope = req.organizationId ? { organizationId: req.organizationId } : {};
    const questions = await Question.find({ ...scope, type: { $in: ["SHORT_TEXT", "LONG_TEXT"] }, status: "ACTIVE" }).select("_id questionText formId").lean();
    const questionIds = questions.map((q) => q._id);
    const answers = questionIds.length ? await Answer.find({ ...scope, questionId: { $in: questionIds } }).sort({ createdAt: -1 }).limit(500).lean() : [];
    const questionMap = Object.fromEntries(questions.map((q) => [idString(q._id), q]));

    return res.status(200).json({
      generatedAt: new Date(),
      comments: answers.filter((a) => String(a.value ?? "").trim()).map((a) => ({ questionId: a.questionId, questionText: questionMap[idString(a.questionId)]?.questionText || "Question", comment: String(a.value), createdAt: a.createdAt })),
    });
  } catch (error) {
    console.error("Get comments report error:", error);
    return res.status(500).json({ message: "Failed to generate comments report" });
  }
};

module.exports = {
  getFormReport,
  getGroupReport,
  getQuestionReport,
  getPeriodReport,
  getParticipationReport,
  getCommentsReport,
};
