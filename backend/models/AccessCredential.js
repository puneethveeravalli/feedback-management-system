const mongoose = require("mongoose");

const accessCredentialSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },

    // GROUP means the access was configured for the whole group.
    // PARTICIPANT means the access belongs to one participant.
    scopeType: {
      type: String,
      enum: ["GROUP", "PARTICIPANT"],
      required: true,
      default: "PARTICIPANT",
      index: true,
    },

    // Null for shared group code/link/QR.
    // Set for participant-scoped access and group LOGIN credentials.
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      default: null,
      index: true,
    },

    accessType: {
      type: String,
      enum: ["LOGIN", "ACCESS_CODE", "UNIQUE_LINK", "QR"],
      required: true,
      index: true,
    },

    accessCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      select: false,
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
      index: true,
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
  { timestamps: true }
);

accessCredentialSchema.index({
  organizationId: 1,
  assignmentId: 1,
  scopeType: 1,
  participantId: 1,
  accessType: 1,
  status: 1,
});

accessCredentialSchema.index({ accessCode: 1 }, { sparse: true });
accessCredentialSchema.index({ uniqueToken: 1 }, { sparse: true });

module.exports = mongoose.model(
  "AccessCredential",
  accessCredentialSchema
);
