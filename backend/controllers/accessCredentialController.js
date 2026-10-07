const crypto = require("crypto");
const mongoose = require("mongoose");

const AccessCredential = require("../models/AccessCredential");
const AccessSession = require("../models/AccessSession");
const Assignment = require("../models/Assignment");
const Participant = require("../models/Participant");
const FeedbackForm = require("../models/FeedbackForm");
const Question = require("../models/Question");
const Response = require("../models/Response");

const PUBLIC_ACCESS_TYPES = [
  "ACCESS_CODE",
  "UNIQUE_LINK",
  "QR",
];

const ALL_ACCESS_TYPES = [
  "LOGIN",
  ...PUBLIC_ACCESS_TYPES,
];

const SCOPE_TYPES = [
  "GROUP",
  "PARTICIPANT",
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const hashToken = (token) =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const generateAccessCode = () =>
  crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

const generateToken = () =>
  crypto.randomBytes(32).toString("hex");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getClientUrl = () =>
  (
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");

/*
|--------------------------------------------------------------------------
| Organization
|--------------------------------------------------------------------------
*/

const requireOrganization = (
  req,
  res
) => {
  if (!req.organizationId) {
    res.status(400).json({
      success: false,
      message:
        "Select an organization before managing access.",
    });

    return null;
  }

  return req.organizationId;
};

/*
|--------------------------------------------------------------------------
| Expiry
|--------------------------------------------------------------------------
*/

const parseExpiry = (value) => {
  if (!value) {
    return {
      value: null,
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      error: "Invalid expiry date",
    };
  }

  if (date <= new Date()) {
    return {
      error:
        "Expiry date must be in the future",
    };
  }

  return {
    value: date,
  };
};

/*
|--------------------------------------------------------------------------
| Load Assignment
|--------------------------------------------------------------------------
*/

const loadAssignment = async (
  assignmentId,
  organizationId
) => {
  if (!isValidObjectId(assignmentId)) {
    return null;
  }

  return Assignment.findOne({
    _id: assignmentId,
    organizationId,
  })
    .populate(
      "formId",
      "title status startDate endDate responseMode allowMultipleResponses confirmationMessage"
    )
    .populate(
      "groupId",
      "name status"
    );
};

/*
|--------------------------------------------------------------------------
| Validate Assignment
|--------------------------------------------------------------------------
*/

const validateAssignment = (
  assignment
) => {
  if (!assignment) {
    return "Assignment not found";
  }

  if (
    assignment.status !==
    "ACTIVE"
  ) {
    return "Cannot create access for an inactive assignment";
  }

  if (!assignment.formId) {
    return "The assignment does not have a valid feedback form";
  }

  if (
    ["CLOSED", "ARCHIVED"].includes(
      assignment.formId.status
    )
  ) {
    return "Cannot create access for a closed or archived form";
  }

  if (
    !assignment.groupId ||
    assignment.groupId.status !==
      "ACTIVE"
  ) {
    return "The assignment group is inactive";
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Validate Participant
|--------------------------------------------------------------------------
*/

const validateParticipant = async (
  participantId,
  assignment,
  organizationId
) => {
  if (
    !isValidObjectId(
      participantId
    )
  ) {
    return {
      error:
        "Invalid participant ID",
    };
  }

  const participant =
    await Participant.findOne({
      _id: participantId,
      organizationId,
    });

  if (!participant) {
    return {
      error:
        "Participant not found",
    };
  }

  if (
    participant.status !==
    "ACTIVE"
  ) {
    return {
      error:
        "Participant is inactive",
    };
  }

  /*
   * The participant still needs to belong to
   * the assignment group.
   *
   * This validates the ADMIN configuration.
   *
   * IMPORTANT:
   *
   * This does NOT mean every group member gets
   * access to a PARTICIPANT credential.
   */
  if (
    !participant.groupId ||
    participant.groupId.toString() !==
      assignment.groupId._id.toString()
  ) {
    return {
      error:
        "Participant does not belong to the assignment group",
    };
  }

  return {
    participant,
  };
};

/*
|--------------------------------------------------------------------------
| Output Credential
|--------------------------------------------------------------------------
*/

const outputCredential = (
  credential,
  participant = null
) => {
  let accessUrl;

  if (
    ["UNIQUE_LINK", "QR"].includes(
      credential.accessType
    )
  ) {
    accessUrl =
      `${getClientUrl()}/participant-access?token=${encodeURIComponent(
        credential.uniqueToken
      )}`;
  }

  return {
    id: credential._id,

    assignmentId:
      credential.assignmentId,

    participantId:
      credential.participantId ||
      null,

    participantName:
      participant?.name ||
      null,

    scopeType:
      credential.scopeType,

    accessType:
      credential.accessType,

    accessCode:
      credential.accessCode ||
      undefined,

    accessUrl,

    expiresAt:
      credential.expiresAt,

    status:
      credential.status,
  };
};

/*
|--------------------------------------------------------------------------
| Create Access Credential
|--------------------------------------------------------------------------
*/

const createAccessCredential =
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

      const {
        assignmentId,
        scopeType = "GROUP",
        participantId,
        accessType,
        expiresAt,
      } = req.body;

      if (
        !assignmentId ||
        !accessType
      ) {
        return res.status(400).json({
          success: false,
          message:
            "assignmentId and accessType are required",
        });
      }

      if (
        !SCOPE_TYPES.includes(
          scopeType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "scopeType must be GROUP or PARTICIPANT",
        });
      }

      if (
        !ALL_ACCESS_TYPES.includes(
          accessType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Access method must be one of: ${ALL_ACCESS_TYPES.join(
              ", "
            )}`,
        });
      }

      const expiry =
        parseExpiry(expiresAt);

      if (expiry.error) {
        return res.status(400).json({
          success: false,
          message:
            expiry.error,
        });
      }

      const assignment =
        await loadAssignment(
          assignmentId,
          organizationId
        );

      const assignmentError =
        validateAssignment(
          assignment
        );

      if (assignmentError) {
        return res.status(400).json({
          success: false,
          message:
            assignmentError,
        });
      }

      const form =
        assignment.formId;

      /*
       * ---------------------------------------------------------------
       * GROUP ACCESS RULE
       * ---------------------------------------------------------------
       *
       * Anonymous forms:
       *   GROUP + ACCESS_CODE / UNIQUE_LINK / QR
       *   are allowed.
       *
       * Identified forms:
       *   GROUP access requires LOGIN because a shared public
       *   credential cannot identify the participant.
       */
      if (
        scopeType === "GROUP" &&
        form.responseMode ===
          "IDENTIFIED" &&
        accessType !== "LOGIN"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identified feedback for an entire group requires Login access.",
        });
      }

      let participantsForLogin =
        [];

      /*
       * GROUP + LOGIN
       *
       * Create one login credential per active
       * participant in the selected group.
       */
      if (
        scopeType === "GROUP" &&
        accessType === "LOGIN"
      ) {
        participantsForLogin =
          await Participant.find({
            organizationId,
            groupId:
              assignment.groupId._id,
            status: "ACTIVE",
          }).sort({
            name: 1,
          });

        if (
          !participantsForLogin.length
        ) {
          return res.status(400).json({
            success: false,
            message:
              "No active participants are available in the selected group.",
          });
        }
      }

      let participant = null;

      /*
       * PARTICIPANT SCOPE
       *
       * Validate the selected participant.
       */
      if (
        scopeType ===
        "PARTICIPANT"
      ) {
        if (!participantId) {
          return res.status(400).json({
            success: false,
            message:
              "participantId is required for individual access",
          });
        }

        const result =
          await validateParticipant(
            participantId,
            assignment,
            organizationId
          );

        if (result.error) {
          return res.status(400).json({
            success: false,
            message:
              result.error,
          });
        }

        participant =
          result.participant;
      }

      /*
       * ---------------------------------------------------------------
       * LOGIN ACCESS
       * ---------------------------------------------------------------
       *
       * LOGIN credentials are always associated with a specific
       * participant account.
       *
       * GROUP + LOGIN:
       *   one credential per group participant.
       *
       * PARTICIPANT + LOGIN:
       *   one credential for selected participant.
       */
      if (
        accessType === "LOGIN"
      ) {
        const targets =
          scopeType === "GROUP"
            ? participantsForLogin
            : [participant];

        const createdCredentials =
          [];

        for (
          const targetParticipant of targets
        ) {
          const duplicateFilter =
            {
              organizationId,
              assignmentId,
              scopeType,
              accessType:
                "LOGIN",
              participantId:
                targetParticipant._id,
              status: "ACTIVE",
            };

          const existing =
            await AccessCredential.findOne(
              duplicateFilter
            );

          if (existing) {
            createdCredentials.push(
              outputCredential(
                existing,
                targetParticipant
              )
            );

            continue;
          }

          const credential =
            await AccessCredential.create(
              {
                organizationId,
                assignmentId,
                scopeType,
                participantId:
                  targetParticipant._id,
                accessType:
                  "LOGIN",
                status: "ACTIVE",
                expiresAt:
                  expiry.value,
              }
            );

          createdCredentials.push(
            outputCredential(
              credential,
              targetParticipant
            )
          );
        }

        return res.status(201).json({
          success: true,

          message:
            scopeType ===
            "GROUP"
              ? `Login access prepared for ${createdCredentials.length} participants.`
              : "Login access prepared successfully.",

          credential:
            createdCredentials[0] ||
            null,

          credentials:
            createdCredentials,

          count:
            createdCredentials.length,
        });
      }

      /*
       * ---------------------------------------------------------------
       * PUBLIC ACCESS
       * ---------------------------------------------------------------
       *
       * GROUP:
       *   participantId = null
       *
       * PARTICIPANT:
       *   participantId = selected participant
       */
      const duplicateFilter = {
        organizationId,
        assignmentId,
        scopeType,
        accessType,
        participantId:
          participant?._id ||
          null,
        status: "ACTIVE",
      };

      const existing =
        await AccessCredential.findOne(
          duplicateFilter
        );

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "An active access credential already exists for this selection",
        });
      }

      const accessCode =
        accessType ===
        "ACCESS_CODE"
          ? generateAccessCode()
          : "";

      const uniqueToken =
        [
          "UNIQUE_LINK",
          "QR",
        ].includes(
          accessType
        )
          ? generateToken()
          : "";

      const credential =
        await AccessCredential.create({
          organizationId,
          assignmentId,
          scopeType,
          participantId:
            participant?._id ||
            null,
          accessType,
          accessCode,
          uniqueToken,
          status: "ACTIVE",
          expiresAt:
            expiry.value,
        });

      return res.status(201).json({
        success: true,

        message:
          "Access credential created successfully",

        credential:
          outputCredential(
            credential,
            participant
          ),

        credentials: [
          outputCredential(
            credential,
            participant
          ),
        ],

        count: 1,
      });
    } catch (error) {
      console.error(
        "Create access credential error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create access credential",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Access Credentials
|--------------------------------------------------------------------------
*/

const getAccessCredentials =
  async (req, res) => {
    try {
      const filter =
        req.organizationId
          ? {
              organizationId:
                req.organizationId,
              accessType: {
                $in:
                  ALL_ACCESS_TYPES,
              },
            }
          : {
              accessType: {
                $in:
                  ALL_ACCESS_TYPES,
              },
            };

      const credentials =
        await AccessCredential.find(
          filter
        )
          .select(
            "+accessCode +uniqueToken"
          )
          .populate({
            path: "assignmentId",
            populate: [
              {
                path: "formId",
                select:
                  "title status responseMode",
              },
              {
                path: "groupId",
                select:
                  "name status",
              },
            ],
          })
          .populate(
            "participantId",
            "name email externalId"
          )
          .sort({
            createdAt: -1,
          });

      const safeCredentials =
        credentials.map(
          (credential) => ({
            ...credential.toObject(),

            accessUrl: [
              "UNIQUE_LINK",
              "QR",
            ].includes(
              credential.accessType
            )
              ? `${getClientUrl()}/participant-access?token=${encodeURIComponent(
                  credential.uniqueToken
                )}`
              : undefined,

            uniqueToken:
              undefined,
          })
        );

      return res.status(200).json({
        success: true,
        credentials:
          safeCredentials,
      });
    } catch (error) {
      console.error(
        "Get access credentials error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch access credentials",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Access Credential By ID
|--------------------------------------------------------------------------
*/

const getAccessCredentialById =
  async (req, res) => {
    try {
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

      const credential =
        await AccessCredential.findOne(
          filter
        )
          .populate({
            path: "assignmentId",
            populate: [
              {
                path: "formId",
                select:
                  "title status responseMode",
              },
              {
                path: "groupId",
                select:
                  "name status",
              },
            ],
          })
          .populate(
            "participantId",
            "name email externalId"
          );

      if (!credential) {
        return res.status(404).json({
          success: false,
          message:
            "Access credential not found",
        });
      }

      return res.status(200).json({
        success: true,
        credential,
      });
    } catch (error) {
      console.error(
        "Get access credential error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch access credential",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Revoke Access Credential
|--------------------------------------------------------------------------
*/

const revokeAccessCredential =
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

      const credential =
        await AccessCredential.findOne(
          {
            _id: req.params.id,
            organizationId,
          }
        );

      if (!credential) {
        return res.status(404).json({
          success: false,
          message:
            "Access credential not found",
        });
      }

      credential.status =
        "REVOKED";

      await credential.save();

      /*
       * Remove active sessions associated with
       * the revoked credential.
       */
      await AccessSession.deleteMany({
        credentialId:
          credential._id,
      });

      return res.status(200).json({
        success: true,
        message:
          "Access credential revoked successfully",
      });
    } catch (error) {
      console.error(
        "Revoke access credential error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to revoke access credential",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Resolve Public Credential
|--------------------------------------------------------------------------
*/

const resolvePublicCredential =
  async ({
    accessCode,
    uniqueToken,
  }) => {
    /*
     * ACCESS CODE
     */
    if (accessCode) {
      return AccessCredential.findOne({
        accessCode:
          accessCode
            .trim()
            .toUpperCase(),

        status: "ACTIVE",

        accessType:
          "ACCESS_CODE",
      })
        .select(
          "+accessCode +uniqueToken"
        )
        .populate(
          "assignmentId"
        )
        .populate(
          "participantId"
        );
    }

    /*
     * UNIQUE LINK / QR
     */
    if (uniqueToken) {
      return AccessCredential.findOne({
        uniqueToken,

        status: "ACTIVE",

        accessType: {
          $in: [
            "UNIQUE_LINK",
            "QR",
          ],
        },
      })
        .select(
          "+uniqueToken"
        )
        .populate(
          "assignmentId"
        )
        .populate(
          "participantId"
        );
    }

    return null;
  };

/*
|--------------------------------------------------------------------------
| Validate Access Credential
|--------------------------------------------------------------------------
|
| IMPORTANT SECURITY RULE
|
| GROUP:
|   Anyone belonging to the assignment group may use
|   the credential.
|
| PARTICIPANT:
|   Only the participant stored on the credential may use
|   the credential.
|
| The assignment group does NOT automatically expand a
| PARTICIPANT credential to all members of that group.
|--------------------------------------------------------------------------
*/

const validateAccessCredential =
  async (req, res) => {
    try {
      const {
        accessCode,
        uniqueToken,
      } = req.body;

      if (
        !accessCode &&
        !uniqueToken
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Provide an access code or secure link",
        });
      }

      /*
       * Find credential.
       */
      const credential =
        await resolvePublicCredential(
          {
            accessCode,
            uniqueToken,
          }
        );

      if (!credential) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired access credential",
        });
      }

      /*
       * Expiry validation.
       */
      if (
        credential.expiresAt &&
        new Date() >
          new Date(
            credential.expiresAt
          )
      ) {
        credential.status =
          "EXPIRED";

        await credential.save();

        return res.status(401).json({
          success: false,
          message:
            "Access credential has expired",
        });
      }

      /*
       * Assignment validation.
       */
      const assignment =
        credential.assignmentId;

      if (
        !assignment ||
        assignment.status !==
          "ACTIVE"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Assignment is not active",
        });
      }

      /*
       * Load form.
       */
      const form =
        await FeedbackForm.findOne({
          _id:
            assignment.formId,

          organizationId:
            credential.organizationId,
        });

      if (!form) {
        return res.status(404).json({
          success: false,
          message:
            "Feedback form not found",
        });
      }

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

      /*
       * Schedule validation.
       */
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

      /*
       * ---------------------------------------------------------------
       * CRITICAL ACCESS-SCOPE VALIDATION
       * ---------------------------------------------------------------
       */

      let participant = null;

      /*
       * GROUP SCOPE
       *
       * A GROUP credential does not belong to one participant.
       *
       * Therefore the participantId on the credential should normally
       * be null.
       *
       * The group eligibility is enforced when the participant is
       * authenticated/identified elsewhere.
       *
       * Anonymous GROUP access can remain public.
       */
      if (
        credential.scopeType ===
        "GROUP"
      ) {
        /*
         * There is intentionally NO participant-specific
         * restriction here.
         *
         * This preserves:
         *
         * GROUP + ACCESS_CODE
         * GROUP + UNIQUE_LINK
         * GROUP + QR
         *
         * for anonymous group feedback.
         */
        participant = null;
      }

      /*
       * PARTICIPANT SCOPE
       *
       * THIS IS THE IMPORTANT FIX.
       *
       * A participant credential can NEVER be used by
       * another participant.
       */
      if (
        credential.scopeType ===
        "PARTICIPANT"
      ) {
        /*
         * The credential must have a participant.
         */
        if (
          !credential.participantId
        ) {
          return res.status(403).json({
            success: false,
            message:
              "This participant access credential is not configured correctly.",
          });
        }

        /*
         * Participant credentials require login.
         *
         * optionalAuthMiddleware will populate req.user
         * when the participant has a valid JWT.
         */
        if (
          !req.user ||
          req.user.role !==
            "PARTICIPANT" ||
          !req.user.participantId
        ) {
          return res.status(401).json({
            success: false,
            message:
              "Please login as the assigned participant before using this access credential.",
          });
        }

      
        if (
          req.user.participantId.toString() !==
          credential.participantId._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message:
              "You are not authorized to access this feedback. This credential belongs to another participant.",
          });
        }

        /*
         * Load participant.
         */
        participant =
          credential.participantId;

        if (
          participant.status !==
          "ACTIVE"
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Participant is inactive",
          });
        }

        if (
          !participant.groupId ||
          participant.groupId.toString() !==
            assignment.groupId.toString()
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Participant is no longer eligible for this assignment.",
          });
        }
      }

      /*
       * ---------------------------------------------------------------
       * QUESTIONS
       * ---------------------------------------------------------------
       */

      const questions =
        await Question.find({
          organizationId:
            credential.organizationId,

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

     
      const sharedAnonymousGroupAccess =
        credential.scopeType ===
          "GROUP" &&
        form.responseMode ===
          "ANONYMOUS";

      if (
        !form.allowMultipleResponses &&
        !sharedAnonymousGroupAccess
      ) {
        const existing =
          await Response.findOne({
            credentialId:
              credential._id,

            status:
              "SUBMITTED",
          });

        if (existing) {
          return res.status(409).json({
            success: false,
            message:
              "You have already submitted this feedback",
          });
        }
      }

      /*
       * ---------------------------------------------------------------
       * CREATE ACCESS SESSION
       * ---------------------------------------------------------------
       */

      const sessionToken =
        generateToken();

      await AccessSession.create({
        organizationId:
          credential.organizationId,

        credentialId:
          credential._id,

       
        participantId:
          participant?._id ||
          null,

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

      /*
       * Update usage.
       */
      credential.lastUsedAt =
        new Date();

      await credential.save();

      /*
       * ---------------------------------------------------------------
       * RESPONSE
       * ---------------------------------------------------------------
       */

      return res.status(200).json({
        success: true,

        message:
          "Access granted",

        access: {
          assignmentId:
            assignment._id,

          formId:
            form._id,

          accessType:
            credential.accessType,

          scopeType:
            credential.scopeType,

          sessionToken,

          /*
           * Anonymous feedback:
           * do not expose participant identity.
           *
           * Identified individual feedback:
           * participant ID is available internally.
           */
          participantId:
            form.responseMode ===
            "ANONYMOUS"
              ? null
              : participant?._id ||
                null,
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
        "Validate access credential error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to validate access",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createAccessCredential,
  getAccessCredentials,
  getAccessCredentialById,
  revokeAccessCredential,
  validateAccessCredential,
  ALL_ACCESS_TYPES,
};