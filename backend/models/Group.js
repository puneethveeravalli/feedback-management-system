const mongoose = require("mongoose");

const groupSchema =
  new mongoose.Schema(
    {
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },

      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

groupSchema.index({
  organizationId: 1,
  departmentId: 1,
  name: 1,
});

module.exports =
  mongoose.model(
    "Group",
    groupSchema
  );