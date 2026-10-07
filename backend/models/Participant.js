const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      required: true,
    },
    externalId: {
      type: String,
      trim: true,
      maxlength: 100,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

participantSchema.index({ organizationId: 1, externalId: 1 });
participantSchema.index({ organizationId: 1, email: 1 });
participantSchema.index({ organizationId: 1, groupId: 1 });

module.exports = mongoose.model("Participant", participantSchema);
