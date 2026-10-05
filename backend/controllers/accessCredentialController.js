const crypto = require("crypto");

const AccessCredential = require("../models/AccessCredential");
const Assignment = require("../models/Assignment");
const Participant = require("../models/Participant");
const FeedbackForm = require("../models/FeedbackForm");

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
const validateAccessCredential = async (req, res) => {
  try {
    const { accessCode, password, uniqueToken } = req.body;

    const organizationId = req.user?.organizationId || null;

    let credential;

    // --------------------------------
    // 1. ACCESS CODE + PASSWORD
    // --------------------------------
    if (accessCode) {
      credential = await AccessCredential.findOne({
        accessCode,
        status: "ACTIVE",
        ...(organizationId ? { organizationId } : {}),
      })
        .select("+password")
        .populate("assignmentId")
        .populate("participantId");
    }

    // --------------------------------
    // 2. UNIQUE LINK / QR TOKEN
    // --------------------------------
    if (!credential && uniqueToken) {
      credential = await AccessCredential.findOne({
        uniqueToken,
        status: "ACTIVE",
        ...(organizationId ? { organizationId } : {}),
      })
        .populate("assignmentId")
        .populate("participantId");
    }

    // --------------------------------
    // 3. Credential not found
    // --------------------------------
    if (!credential) {
      return res.status(401).json({
        message: "Invalid or expired access credential",
      });
    }

    // --------------------------------
    // 4. Check expiry
    // --------------------------------
    if (
      credential.expiresAt &&
      new Date() > new Date(credential.expiresAt)
    ) {
      credential.status = "EXPIRED";
      await credential.save();

      return res.status(401).json({
        message: "Access credential has expired",
      });
    }

    // --------------------------------
    // 5. Validate password
    // --------------------------------
    if (credential.accessType === "ACCESS_CODE") {
      if (!password) {
        return res.status(400).json({
          message: "Password is required",
        });
      }

      if (credential.password !== password) {
        return res.status(401).json({
          message: "Invalid access code or password",
        });
      }
    }

    // --------------------------------
    // 6. Validate assignment
    // --------------------------------
    const assignment = credential.assignmentId;

    if (!assignment || assignment.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Assignment is not active",
      });
    }

    // --------------------------------
    // 7. Validate participant
    // --------------------------------
    const participant = credential.participantId;

    if (!participant || participant.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Participant is not active",
      });
    }

    // --------------------------------
    // 8. Validate form
    // --------------------------------
    const form = await FeedbackForm.findOne({
      _id: assignment.formId,
      organizationId: credential.organizationId,
    });

    if (!form) {
      return res.status(404).json({
        message: "Feedback form not found",
      });
    }

    // --------------------------------
    // 9. Check form status
    // --------------------------------
    if (!["PUBLISHED", "ACTIVE"].includes(form.status)) {
      return res.status(403).json({
        message: "Feedback form is not available",
      });
    }

    // --------------------------------
    // 10. Check start date
    // --------------------------------
    const now = new Date();

    if (form.startDate && now < new Date(form.startDate)) {
      return res.status(403).json({
        message: "Feedback form has not started yet",
      });
    }

    // --------------------------------
    // 11. Check end date
    // --------------------------------
    if (form.endDate && now > new Date(form.endDate)) {
      return res.status(403).json({
        message: "Feedback form has closed",
      });
    }

    // --------------------------------
    // 12. Update last used
    // --------------------------------
    credential.lastUsedAt = new Date();

    await credential.save();

    // --------------------------------
    // 13. Return access information
    // --------------------------------
    res.status(200).json({
      message: "Access granted",

      access: {
        assignmentId: assignment._id,
        participantId: participant._id,
        formId: form._id,
        accessType: credential.accessType,
      },

      form: {
        id: form._id,
        title: form.title,
        description: form.description,
        responseMode: form.responseMode,
        allowMultipleResponses: form.allowMultipleResponses,
        confirmationMessage: form.confirmationMessage,
      },
    });
  } catch (error) {
    console.error("Validate access credential error:", error);

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
    validateAccessCredential
};