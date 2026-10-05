const Participant = require("../models/Participant");
const Group = require("../models/Group");

const createParticipant = async (req, res) => {
  try {
    const {
      groupId,
      name,
      email,
      externalId,
    } = req.body;

    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    if (!groupId || !name) {
      return res.status(400).json({
        success: false,
        message: "Group and participant name are required",
      });
    }

    // Verify group belongs to current organization
    const group = await Group.findOne({
      _id: groupId,
      organizationId,
    });

    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Invalid group",
      });
    }

    // Prevent duplicate external ID within organization
    if (externalId) {
      const existingParticipant =
        await Participant.findOne({
          organizationId,
          externalId,
        });

      if (existingParticipant) {
        return res.status(409).json({
          success: false,
          message: "Participant with this external ID already exists",
        });
      }
    }

    const participant = await Participant.create({
      organizationId,
      groupId,
      name: name.trim(),
      email: email
        ? email.toLowerCase().trim()
        : "",
      externalId: externalId
        ? externalId.trim()
        : "",
    });

    return res.status(201).json({
      success: true,
      message: "Participant created successfully",
      participant,
    });
  } catch (error) {
    console.error(
      "Create Participant Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while creating participant",
    });
  }
};
const getParticipants = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const filter = {
      organizationId,
    };

    if (req.query.groupId) {
      filter.groupId = req.query.groupId;
    }

    const participants =
      await Participant.find(filter)
        .populate("groupId", "name")
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: participants.length,
      participants,
    });
  } catch (error) {
    console.error(
      "Get Participants Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching participants",
    });
  }
};
const getParticipantById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const participant =
      await Participant.findOne({
        _id: id,
        organizationId,
      }).populate("groupId", "name");

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    return res.status(200).json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error(
      "Get Participant Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching participant",
    });
  }
};
const updateParticipant = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      groupId,
      name,
      email,
      externalId,
    } = req.body;

    const organizationId = req.user.organizationId;

    const participant =
      await Participant.findOne({
        _id: id,
        organizationId,
      });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    if (groupId !== undefined) {
      const group = await Group.findOne({
        _id: groupId,
        organizationId,
      });

      if (!group) {
        return res.status(400).json({
          success: false,
          message: "Invalid group",
        });
      }

      participant.groupId = groupId;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Participant name cannot be empty",
        });
      }

      participant.name = name.trim();
    }

    if (email !== undefined) {
      participant.email = email
        .toLowerCase()
        .trim();
    }

    if (externalId !== undefined) {
      participant.externalId =
        externalId.trim();
    }

    await participant.save();

    return res.status(200).json({
      success: true,
      message: "Participant updated successfully",
      participant,
    });
  } catch (error) {
    console.error(
      "Update Participant Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating participant",
    });
  }
};
const updateParticipantStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const organizationId =
      req.user.organizationId;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid participant status",
      });
    }

    const participant =
      await Participant.findOneAndUpdate(
        {
          _id: id,
          organizationId,
        },
        {
          status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Participant status updated successfully",
      participant,
    });
  } catch (error) {
    console.error(
      "Update Participant Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating participant status",
    });
  }
};
module.exports = {
  createParticipant,
  getParticipants,
  getParticipantById,
  updateParticipant,
  updateParticipantStatus,
};