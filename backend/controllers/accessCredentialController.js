const crypto = require("crypto");

const AccessCredential = require("../models/AccessCredential");
const Assignment = require("../models/Assignment");
const Participant = require("../models/Participant");

const createAccessCredential = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const {
      assignmentId,
      participantId,
      accessType,
      expiresAt,
    } = req.body;

    // 1. Validate required fields
    if (!assignmentId || !participantId || !accessType) {
      return res.status(400).json({
        message: "assignmentId, participantId and accessType are required",
      });
    }

    // 2. Validate access type
    const allowedAccessTypes = [
      "LOGIN",
      "ACCESS_CODE",
      "UNIQUE_LINK",
      "QR",
    ];

    if (!allowedAccessTypes.includes(accessType)) {
      return res.status(400).json({
        message: "Invalid accessType",
      });
    }

    // 3. Check assignment belongs to same organization
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      organizationId,
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    // 4. Check participant belongs to same organization
    const participant = await Participant.findOne({
      _id: participantId,
      organizationId,
    });

    if (!participant) {
      return res.status(404).json({
        message: "Participant not found",
      });
    }

    // 5. Check participant belongs to assignment group
    if (participant.groupId.toString() !== assignment.groupId.toString()) {
      return res.status(400).json({
        message: "Participant does not belong to the assignment group",
      });
    }

    // 6. Prevent duplicate active credential
    const existingCredential = await AccessCredential.findOne({
      organizationId,
      assignmentId,
      participantId,
      status: "ACTIVE",
    });

    if (existingCredential) {
      return res.status(409).json({
        message: "Active access credential already exists",
      });
    }

    // 7. Generate credentials
    let accessCode = "";
    let password = "";
    let uniqueToken = "";

    if (accessType === "ACCESS_CODE") {
      accessCode = crypto.randomBytes(4).toString("hex").toUpperCase();

      password = crypto.randomBytes(6).toString("base64url");
    }

    if (accessType === "UNIQUE_LINK" || accessType === "QR") {
      uniqueToken = crypto.randomBytes(32).toString("hex");
    }

    // 8. Create credential
    const credential = await AccessCredential.create({
      organizationId,
      assignmentId,
      participantId,
      accessType,
      accessCode,
      password,
      uniqueToken,
      expiresAt: expiresAt || null,
    });

    // 9. Return credential
    res.status(201).json({
      message: "Access credential created successfully",

      credential: {
        id: credential._id,
        assignmentId: credential.assignmentId,
        participantId: credential.participantId,
        accessType: credential.accessType,
        accessCode: accessCode || undefined,
        password: password || undefined,
        uniqueToken: uniqueToken || undefined,
        expiresAt: credential.expiresAt,
        status: credential.status,
      },
    });
  } catch (error) {
    console.error("Create access credential error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// GET all credentials
const getAccessCredentials = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const filter = {
      organizationId,
    };

    if (req.query.assignmentId) {
      filter.assignmentId = req.query.assignmentId;
    }

    if (req.query.participantId) {
      filter.participantId = req.query.participantId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const credentials = await AccessCredential.find(filter)
      .populate("assignmentId", "formId groupId targetId status")
      .populate("participantId", "name email groupId")
      .select("-password -uniqueToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: credentials.length,
      credentials,
    });
  } catch (error) {
    console.error("Get access credentials error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// GET single credential
const getAccessCredentialById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const credential = await AccessCredential.findOne({
      _id: req.params.id,
      organizationId,
    })
      .populate("assignmentId", "formId groupId targetId status")
      .populate("participantId", "name email groupId")
      .select("-password -uniqueToken");

    if (!credential) {
      return res.status(404).json({
        message: "Access credential not found",
      });
    }

    res.status(200).json({
      credential,
    });
  } catch (error) {
    console.error("Get access credential error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// Revoke credential
const revokeAccessCredential = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const credential = await AccessCredential.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!credential) {
      return res.status(404).json({
        message: "Access credential not found",
      });
    }

    credential.status = "REVOKED";

    await credential.save();

    res.status(200).json({
      message: "Access credential revoked successfully",
    });
  } catch (error) {
    console.error("Revoke access credential error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


module.exports = {
  createAccessCredential,
  getAccessCredentials,
  getAccessCredentialById,
  revokeAccessCredential,
};