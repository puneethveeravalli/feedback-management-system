const Participant = require("../models/Participant");
const Assignment = require("../models/Assignment");
const FeedbackForm = require("../models/FeedbackForm");


// Get feedback forms available to a participant
const getParticipantAssignments = async (req, res) => {
  try {
    const participantId = req.user.participantId;
    const organizationId = req.user.organizationId;

    // 1. Check participant
    const participant = await Participant.findOne({
      _id: participantId,
      organizationId,
      status: "ACTIVE",
    });

    if (!participant) {
      return res.status(404).json({
        message: "Participant not found or inactive",
      });
    }

    // 2. Find assignments for participant's group
    const assignments = await Assignment.find({
      organizationId,
      groupId: participant.groupId,
      status: "ACTIVE",
    })
      .populate(
        "formId",
        "title description startDate endDate responseMode allowMultipleResponses confirmationMessage status"
      )
      .populate(
        "targetId",
        "name type description status"
      )
      .sort({ createdAt: -1 });

    // 3. Keep only forms that are currently available
    const now = new Date();

    const availableAssignments = assignments.filter((assignment) => {
      const form = assignment.formId;

      if (!form) {
        return false;
      }

      // Form must be active/published
      if (!["PUBLISHED", "ACTIVE"].includes(form.status)) {
        return false;
      }

      // Start date check
      if (form.startDate && now < new Date(form.startDate)) {
        return false;
      }

      // End date check
      if (form.endDate && now > new Date(form.endDate)) {
        return false;
      }

      return true;
    });

    res.status(200).json({
      count: availableAssignments.length,
      assignments: availableAssignments,
    });
  } catch (error) {
    console.error(
      "Get participant assignments error:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};


module.exports = {
  getParticipantAssignments,
};