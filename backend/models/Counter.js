const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

counterSchema.index({ organizationId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);
