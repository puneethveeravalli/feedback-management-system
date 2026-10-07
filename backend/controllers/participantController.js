const mongoose = require("mongoose");
const crypto = require("crypto");

const Participant = require("../models/Participant");
const User = require("../models/User");
const Group = require("../models/Group");
const Assignment = require("../models/Assignment");
const FeedbackForm = require("../models/FeedbackForm");
const Response = require("../models/Response");
const Question = require("../models/Question");
const AccessCredential = require("../models/AccessCredential");
const AccessSession = require("../models/AccessSession");
const Counter = require("../models/Counter");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generatePassword = () =>
  crypto.randomBytes(9).toString("base64url");

const generateSessionToken = () =>
  crypto.randomBytes(32).toString("hex");

const hashToken = (token) =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const requireOrganization = (
  req,
  res
) => {
  if (!req.organizationId) {
    res.status(400).json({
      success: false,
      message:
        "Select an organization before managing participants.",
    });

    return null;
  }

  return req.organizationId;
};

/*
|--------------------------------------------------------------------------
| External ID
|--------------------------------------------------------------------------
*/

const getNextExternalId = async (
  organizationId
) => {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const counter =
      await Counter.findOneAndUpdate(
        {
          organizationId,
          key: "PARTICIPANT",
        },
        {
          $inc: {
            sequence: 1,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    const externalId = `P${String(
      counter.sequence
    ).padStart(3, "0")}`;

    const exists =
      await Participant.exists({
        organizationId,
        externalId,
      });

    if (!exists) {
      return externalId;
    }
  }

  throw new Error(
    "Unable to generate a unique participant External ID"
  );
};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

const validateParticipantInput = ({
  name,
  email,
  groupId,
}) => {
  const errors = {};

  const cleanName = String(
    name || ""
  ).trim();

  const cleanEmail = String(
    email || ""
  )
    .trim()
    .toLowerCase();

  if (!cleanName) {
    errors.name =
      "Participant name is required.";
  } else if (cleanName.length < 2) {
    errors.name =
      "Participant name must contain at least 2 characters.";
  } else if (cleanName.length > 150) {
    errors.name =
      "Participant name cannot exceed 150 characters.";
  }

  if (!cleanEmail) {
    errors.email =
      "Email is required for participant login.";
  } else if (
    !emailRegex.test(cleanEmail)
  ) {
    errors.email =
      "Enter a valid email address.";
  } else if (cleanEmail.length > 150) {
    errors.email =
      "Email cannot exceed 150 characters.";
  }

  if (
    !groupId ||
    !isValidObjectId(groupId)
  ) {
    errors.groupId =
      "A valid group is required.";
  }

  return {
    errors,
    cleanName,
    cleanEmail,
  };
};

const validateGroup = async (
  groupId,
  organizationId
) => {
  return Group.findOne({
    _id: groupId,
    organizationId,
    status: "ACTIVE",
  });
};

/*
|--------------------------------------------------------------------------
| Create Participant
|--------------------------------------------------------------------------
*/

const createParticipantRecord =
  async ({
    organizationId,
    name,
    email,
    groupId,
  }) => {
    const {
      errors,
      cleanName,
      cleanEmail,
    } = validateParticipantInput({
      name,
      email,
      groupId,
    });

    if (Object.keys(errors).length) {
      const error = new Error(
        Object.values(errors)[0]
      );

      error.code = "VALIDATION";

      throw error;
    }

    const group =
      await validateGroup(
        groupId,
        organizationId
      );

    if (!group) {
      const error = new Error(
        "Selected group is not available."
      );

      error.code = "GROUP";

      throw error;
    }

    const existingParticipant =
      await Participant.findOne({
        organizationId,
        email: cleanEmail,
      });

    if (existingParticipant) {
      const error = new Error(
        "A participant with this email already exists."
      );

      error.code = "DUPLICATE";

      throw error;
    }

    const existingUser =
      await User.findOne({
        email: cleanEmail,
      });

    if (existingUser) {
      const error = new Error(
        "A user account already exists with this email address."
      );

      error.code = "DUPLICATE";

      throw error;
    }

    const externalId =
      await getNextExternalId(
        organizationId
      );

    /*
     * Generate the original password once.
     */
    const password =
      generatePassword();

    const participant =
      await Participant.create({
        organizationId,
        groupId,
        name: cleanName,
        email: cleanEmail,
        externalId,
        status: "ACTIVE",
      });

    try {
      /*
       * password:
       *   bcrypt middleware hashes this value.
       *
       * plainPassword:
       *   remains available for administrator
       *   credential viewing.
       */
      const user =
        await User.create({
          organizationId,
          participantId:
            participant._id,
          name: cleanName,
          email: cleanEmail,
          password,
          plainPassword: password,
          role: "PARTICIPANT",
          status: "ACTIVE",
        });

      const populated =
        await Participant.findById(
          participant._id
        ).populate(
          "groupId",
          "name status"
        );

      return {
        participant: populated,

        credentials: {
          name: user.name,
          externalId,
          email: user.email,
          password,
        },
      };
    } catch (error) {
      await Participant.findByIdAndDelete(
        participant._id
      );

      throw error;
    }
  };

const createParticipant =
  async (req, res) => {
    try {
      const organizationId =
        requireOrganization(
          req,
          res
        );

      if (!organizationId) {
        return;
      }

      const result =
        await createParticipantRecord({
          organizationId,
          name: req.body.name,
          email: req.body.email,
          groupId: req.body.groupId,
        });

      return res.status(201).json({
        success: true,
        message:
          "Participant and login account created successfully",
        ...result,
      });
    } catch (error) {
      console.error(
        "Create participant error:",
        error
      );

      const status = [
        "VALIDATION",
        "GROUP",
      ].includes(error.code)
        ? 400
        : error.code === "DUPLICATE"
        ? 409
        : 500;

      return res.status(status).json({
        success: false,
        message:
          error.message ||
          "Failed to create participant",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Bulk Participants
|--------------------------------------------------------------------------
*/

const bulkUploadParticipants =
  async (req, res) => {
    try {
      const organizationId =
        requireOrganization(
          req,
          res
        );

      if (!organizationId) {
        return;
      }

      const rows =
        Array.isArray(
          req.body.participants
        )
          ? req.body.participants
          : [];

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message:
            "No participant records were provided.",
        });
      }

      if (rows.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "A maximum of 1000 participants can be imported at once.",
        });
      }

      const created = [];
      const failed = [];

      for (
        let index = 0;
        index < rows.length;
        index += 1
      ) {
        const row = rows[index] || {};

        const rowNumber =
          index + 2;

        const groupValue =
          row.groupId ||
          row.group ||
          row.groupName ||
          "";

        let groupId =
          groupValue;

        if (
          groupValue &&
          !isValidObjectId(
            groupValue
          )
        ) {
          const escapedName =
            String(groupValue)
              .trim()
              .replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              );

          const group =
            await Group.findOne({
              organizationId,
              name: new RegExp(
                `^${escapedName}$`,
                "i"
              ),
            });

          groupId =
            group?._id;
        }

        try {
          const result =
            await createParticipantRecord(
              {
                organizationId,
                name: row.name,
                email: row.email,
                groupId,
              }
            );

          created.push({
            row: rowNumber,
            ...result.credentials,
          });
        } catch (error) {
          failed.push({
            row: rowNumber,
            name:
              row.name || "",
            email:
              row.email || "",
            message:
              error.message ||
              "Unable to import participant",
          });
        }
      }

      return res
        .status(
          created.length
            ? 201
            : 400
        )
        .json({
          success:
            created.length > 0,

          message: `Import completed: ${created.length} created, ${failed.length} failed.`,

          summary: {
            total: rows.length,
            created:
              created.length,
            failed:
              failed.length,
          },

          created,
          failed,
        });
    } catch (error) {
      console.error(
        "Bulk participant upload error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to import participants.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Participants
|--------------------------------------------------------------------------
*/

const getParticipants =
  async (req, res) => {
    try {
      const filter =
        req.organizationId
          ? {
              organizationId:
                req.organizationId,
            }
          : {};

      const participants =
        await Participant.find(
          filter
        )
          .populate(
            "groupId",
            "name status"
          )
          .sort({
            createdAt: -1,
          });

      const participantIds =
        participants.map(
          (item) => item._id
        );

      /*
       * IMPORTANT:
       *
       * +plainPassword explicitly includes the
       * hidden credential field.
       */
      const users =
        await User.find({
          participantId: {
            $in: participantIds,
          },
          role: "PARTICIPANT",
        })
          .select(
            "participantId email +plainPassword"
          );

      const userByParticipant =
        new Map(
          users.map((item) => [
            item.participantId.toString(),
            item,
          ])
        );

      const enrichedParticipants =
        participants.map(
          (participant) => {
            const item =
              participant.toObject();

            const linkedUser =
              userByParticipant.get(
                participant._id.toString()
              );

            return {
              ...item,

              username:
                linkedUser?.email ||
                participant.email,

              /*
               * New participants:
               *   actual password
               *
               * Old participants:
               *   not available because their password
               *   was created before plainPassword existed.
               */
              password:
                linkedUser?.plainPassword ||
                "Not available",
            };
          }
        );

      return res.status(200).json({
        success: true,
        count:
          enrichedParticipants.length,
        participants:
          enrichedParticipants,
      });
    } catch (error) {
      console.error(
        "Get participants error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch participants",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Participant
|--------------------------------------------------------------------------
*/

const getParticipantById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid participant ID",
        });
      }

      const filter =
        req.organizationId
          ? {
              _id: req.params.id,
              organizationId:
                req.organizationId,
            }
          : {
              _id: req.params.id,
            };

      const participant =
        await Participant.findOne(
          filter
        ).populate(
          "groupId",
          "name status"
        );

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant not found",
        });
      }

      /*
       * Explicitly retrieve plainPassword.
       */
      const linkedUser =
        await User.findOne({
          participantId:
            participant._id,
          role: "PARTICIPANT",
        }).select(
          "email +plainPassword"
        );

      const item =
        participant.toObject();

      return res.status(200).json({
        success: true,

        participant: {
          ...item,

          username:
            linkedUser?.email ||
            participant.email,

          password:
            linkedUser?.plainPassword ||
            "Not available",
        },
      });
    } catch (error) {
      console.error(
        "Get participant error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch participant",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Update Participant
|--------------------------------------------------------------------------
*/

const updateParticipant =
  async (req, res) => {
    try {
      const organizationId =
        requireOrganization(
          req,
          res
        );

      if (!organizationId) {
        return;
      }

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid participant ID",
        });
      }

      const participant =
        await Participant.findOne({
          _id: req.params.id,
          organizationId,
        });

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant not found",
        });
      }

      const {
        errors,
        cleanName,
        cleanEmail,
      } =
        validateParticipantInput({
          name: req.body.name,
          email: req.body.email,
          groupId:
            req.body.groupId,
        });

      if (
        Object.keys(errors).length
      ) {
        return res.status(400).json({
          success: false,
          message:
            Object.values(
              errors
            )[0],
        });
      }

      const group =
        await validateGroup(
          req.body.groupId,
          organizationId
        );

      if (!group) {
        return res.status(400).json({
          success: false,
          message:
            "Selected group is not available.",
        });
      }

      const duplicate =
        await Participant.findOne({
          organizationId,
          email: cleanEmail,
          _id: {
            $ne: participant._id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another participant already uses this email.",
        });
      }

      const linkedUser =
        await User.findOne({
          participantId:
            participant._id,
          role: "PARTICIPANT",
        });

      const emailOwner =
        await User.findOne({
          email: cleanEmail,
          _id: {
            $ne:
              linkedUser?._id,
          },
        });

      if (emailOwner) {
        return res.status(409).json({
          success: false,
          message:
            "A user account already exists with this email address.",
        });
      }

      participant.name =
        cleanName;

      participant.email =
        cleanEmail;

      participant.groupId =
        req.body.groupId;

      await participant.save();

      if (linkedUser) {
        linkedUser.name =
          cleanName;

        linkedUser.email =
          cleanEmail;

        /*
         * If admin explicitly changes the password,
         * update BOTH values.
         */
        if (req.body.password) {
          if (
            req.body.password.length <
            6
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Password must contain at least 6 characters.",
            });
          }

          linkedUser.password =
            req.body.password;

          linkedUser.plainPassword =
            req.body.password;
        }

        await linkedUser.save();
      }

      const updated =
        await Participant.findById(
          participant._id
        ).populate(
          "groupId",
          "name status"
        );

      return res.status(200).json({
        success: true,
        message:
          "Participant updated successfully",
        participant: updated,
      });
    } catch (error) {
      console.error(
        "Update participant error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update participant",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Participant Status
|--------------------------------------------------------------------------
*/

const updateParticipantStatus =
  async (req, res) => {
    try {
      const organizationId =
        requireOrganization(
          req,
          res
        );

      if (!organizationId) {
        return;
      }

      const { status } =
        req.body;

      if (
        ![
          "ACTIVE",
          "INACTIVE",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid participant status",
        });
      }

      const participant =
        await Participant.findOne({
          _id: req.params.id,
          organizationId,
        });

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant not found",
        });
      }

      participant.status =
        status;

      await participant.save();

      await User.updateOne(
        {
          participantId:
            participant._id,
          role: "PARTICIPANT",
        },
        {
          $set: {
            status,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: `Participant ${
          status === "ACTIVE"
            ? "activated"
            : "deactivated"
        } successfully`,
        participant,
      });
    } catch (error) {
      console.error(
        "Update participant status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update participant status",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| My Participant Profile
|--------------------------------------------------------------------------
*/

const getMyParticipant =
  async (req, res) => {
    try {
      const participant =
        await Participant.findOne({
          _id:
            req.user.participantId,
          organizationId:
            req.user.organizationId,
        }).populate(
          "groupId",
          "name status"
        );

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        participant,
      });
    } catch (error) {
      console.error(
        "Get my participant error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load participant profile",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Available Feedback
|--------------------------------------------------------------------------
*/

const getAvailableFeedback =
  async (req, res) => {
    try {
      if (
        req.user.role !==
          "PARTICIPANT" ||
        !req.user.participantId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Participant access required",
        });
      }

      const participant =
        await Participant.findOne({
          _id:
            req.user.participantId,
          organizationId:
            req.user.organizationId,
          status: "ACTIVE",
        }).populate(
          "groupId",
          "name status"
        );

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant profile not found",
        });
      }

      if (
        !participant.groupId ||
        participant.groupId.status !==
          "ACTIVE"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your group is currently inactive",
        });
      }

      const assignments =
        await Assignment.find({
          organizationId:
            req.user.organizationId,
          groupId:
            participant.groupId._id,
          status: "ACTIVE",
        })
          .populate(
            "formId",
            "title description startDate endDate responseMode allowMultipleResponses confirmationMessage status"
          )
          .sort({
            createdAt: -1,
          });

      const now =
        new Date();

      const feedback = [];

      for (
        const assignment of assignments
      ) {
        const form =
          assignment.formId;

        if (
          !form ||
          ![
            "PUBLISHED",
            "ACTIVE",
          ].includes(
            form.status
          )
        ) {
          continue;
        }

        if (
          form.startDate &&
          now <
            new Date(
              form.startDate
            )
        ) {
          continue;
        }

        if (
          form.endDate &&
          now >
            new Date(
              form.endDate
            )
        ) {
          continue;
        }

        const credentials =
          await AccessCredential.find({
            organizationId:
              req.user.organizationId,
            assignmentId:
              assignment._id,
            status: "ACTIVE",
          }).select(
            "scopeType participantId accessType status expiresAt"
          );

        const validCredentials =
          credentials.filter(
            (credential) => {
              if (
                credential.expiresAt &&
                now >
                  new Date(
                    credential.expiresAt
                  )
              ) {
                return false;
              }

              /*
               * GROUP credential:
               * everyone in the assignment group
               * can use the configured method.
               */
              if (
                credential.scopeType ===
                "GROUP"
              ) {
                return true;
              }

              /*
               * PARTICIPANT credential:
               * ONLY the matching participant.
               */
              if (
                credential.scopeType ===
                  "PARTICIPANT" &&
                credential.participantId &&
                credential.participantId.toString() ===
                  participant._id.toString()
              ) {
                return true;
              }

              return false;
            }
          );

        if (
          !validCredentials.length
        ) {
          continue;
        }

        feedback.push({
          assignmentId:
            assignment._id,

          formId:
            form._id,

          title:
            form.title,

          description:
            form.description ||
            "",

          startDate:
            form.startDate,

          endDate:
            form.endDate,

          responseMode:
            form.responseMode,

          allowMultipleResponses:
            form.allowMultipleResponses,

          accessMethods:
            [
              ...new Set(
                validCredentials.map(
                  (credential) =>
                    credential.accessType
                )
              ),
            ],

          status:
            "AVAILABLE",
        });
      }

      return res.status(200).json({
        success: true,

        participant: {
          id: participant._id,
          name: participant.name,
          email: participant.email,
          externalId:
            participant.externalId,

          group:
            participant.groupId
              ? {
                  id:
                    participant
                      .groupId
                      ._id,

                  name:
                    participant
                      .groupId
                      .name,
                }
              : null,
        },

        feedback,
      });
    } catch (error) {
      console.error(
        "Get available participant feedback error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load assigned feedback",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Start Participant Feedback
|--------------------------------------------------------------------------
*/

const startParticipantFeedback =
  async (req, res) => {
    try {
      if (
        req.user.role !==
          "PARTICIPANT" ||
        !req.user.participantId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Participant access required",
        });
      }

      const {
        assignmentId,
      } = req.body;

      if (
        !isValidObjectId(
          assignmentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid assignment ID",
        });
      }

      const participant =
        await Participant.findOne({
          _id:
            req.user.participantId,
          organizationId:
            req.user.organizationId,
          status: "ACTIVE",
        });

      if (!participant) {
        return res.status(404).json({
          success: false,
          message:
            "Participant profile not found",
        });
      }

      const assignment =
        await Assignment.findOne({
          _id: assignmentId,
          organizationId:
            req.user.organizationId,
          groupId:
            participant.groupId,
          status: "ACTIVE",
        }).populate(
          "formId",
          "title description startDate endDate responseMode allowMultipleResponses confirmationMessage status"
        );

      if (
        !assignment ||
        !assignment.formId
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Assigned feedback form was not found",
        });
      }

      const form =
        assignment.formId;

      if (
        ![
          "PUBLISHED",
          "ACTIVE",
        ].includes(
          form.status
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Feedback form is not available",
        });
      }

      const now =
        new Date();

      if (
        form.startDate &&
        now <
          new Date(
            form.startDate
          )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Feedback form has not started yet",
        });
      }

      if (
        form.endDate &&
        now >
          new Date(
            form.endDate
          )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Feedback form has closed",
        });
      }

      const credential =
        await AccessCredential.findOne({
          organizationId:
            req.user.organizationId,

          assignmentId:
            assignment._id,

          status: "ACTIVE",

          accessType:
            "LOGIN",

          $or: [
            {
              scopeType:
                "GROUP",
            },
            {
              scopeType:
                "PARTICIPANT",

              participantId:
                participant._id,
            },
          ],
        }).select(
          "+accessCode +uniqueToken"
        );

      if (!credential) {
        return res.status(403).json({
          success: false,
          message:
            "This feedback form is not configured for participant login. Please use the access method provided by the administrator.",
        });
      }

      if (
        credential.expiresAt &&
        now >
          new Date(
            credential.expiresAt
          )
      ) {
        credential.status =
          "EXPIRED";

        await credential.save();

        return res.status(403).json({
          success: false,
          message:
            "Feedback access has expired.",
        });
      }

      if (
        credential.scopeType ===
        "PARTICIPANT"
      ) {
        if (
          !credential.participantId ||
          credential.participantId.toString() !==
            participant._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message:
              "You are not authorized to access this feedback.",
          });
        }
      }

      if (
        form.responseMode ===
          "IDENTIFIED" &&
        (!credential.participantId ||
          credential.participantId.toString() !==
            participant._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Identified feedback requires participant-specific login access.",
        });
      }

      if (
        [
          "REVOKED",
          "EXPIRED",
        ].includes(
          credential.status
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Feedback access has been revoked or expired",
        });
      }

      if (
        !form.allowMultipleResponses
      ) {
        const submitted =
          await Response.exists({
            organizationId:
              req.user.organizationId,

            assignmentId:
              assignment._id,

            credentialId:
              credential._id,

            status:
              "SUBMITTED",
          });

        if (submitted) {
          return res.status(409).json({
            success: false,
            message:
              "You have already submitted this feedback",
          });
        }
      }

      const questions =
        await Question.find({
          organizationId:
            req.user.organizationId,

          formId:
            form._id,

          status:
            "ACTIVE",
        })
          .sort({
            order: 1,
          })
          .select(
            "_id questionText type options required order minValue maxValue"
          );

      if (!questions.length) {
        return res.status(400).json({
          success: false,
          message:
            "This feedback form has no active questions",
        });
      }

      const sessionToken =
        generateSessionToken();

      await AccessSession.create({
        organizationId:
          req.user.organizationId,

        credentialId:
          credential._id,

        participantId:
          participant._id,

        tokenHash:
          hashToken(
            sessionToken
          ),

        expiresAt:
          new Date(
            Date.now() +
              30 * 60 * 1000
          ),
      });

      credential.lastUsedAt =
        new Date();

      await credential.save();

      return res.status(200).json({
        success: true,

        message:
          "Feedback access granted",

        access: {
          assignmentId:
            assignment._id,

          formId:
            form._id,

          accessType:
            "LOGIN",

          scopeType:
            credential.scopeType,

          sessionToken,

          participantId:
            form.responseMode ===
            "ANONYMOUS"
              ? null
              : participant._id,
        },

        form: {
          id:
            form._id,

          title:
            form.title,

          description:
            form.description,

          responseMode:
            form.responseMode,

          allowMultipleResponses:
            form.allowMultipleResponses,

          confirmationMessage:
            form.confirmationMessage,
        },

        questions,
      });
    } catch (error) {
      console.error(
        "Start participant feedback error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to start feedback",
      });
    }
  };

module.exports = {
  createParticipant,
  bulkUploadParticipants,
  getParticipants,
  getParticipantById,
  updateParticipant,
  updateParticipantStatus,
  getMyParticipant,
  getAvailableFeedback,
  startParticipantFeedback,
};