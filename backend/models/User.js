const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },

   
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      default: null,
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
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

  
    plainPassword: {
      type: String,
      default: null,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ORG_ADMIN",
        "MANAGER",
        "PARTICIPANT",
      ],
      required: true,
      default: "PARTICIPANT",
    },

    permissions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);



userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

/*
|--------------------------------------------------------------------------
| Password comparison
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword =
  async function (candidatePassword) {
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

/*
|--------------------------------------------------------------------------
| Organization + participant lookup index
|--------------------------------------------------------------------------
*/

userSchema.index({
  organizationId: 1,
  participantId: 1,
});

module.exports = mongoose.model(
  "User",
  userSchema
);