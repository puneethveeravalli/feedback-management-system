const mongoose = require("mongoose");

const accessCredentialSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },

    accessType: {
      type: String,
      enum: ["LOGIN", "ACCESS_CODE", "UNIQUE_LINK", "QR"],
      required: true,
    },

    accessCode: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      select: false,
      default: "",
    },

    uniqueToken: {
      type: String,
      select: false,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "REVOKED"],
      default: "ACTIVE",
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accessCredentialSchema.index({
  organizationId: 1,
  assignmentId: 1,
  participantId: 1,
});

accessCredentialSchema.index({
  accessCode: 1,
});

accessCredentialSchema.index({
  uniqueToken: 1,
});

module.exports = mongoose.model(
  "AccessCredential",
  accessCredentialSchema
);