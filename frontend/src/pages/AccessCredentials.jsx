import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const ACCESS_TYPES = [
  { value: "LOGIN", label: "Login" },
  { value: "ACCESS_CODE", label: "Access Code" },
  { value: "UNIQUE_LINK", label: "Unique Link" },
  { value: "QR", label: "QR Code" },
];

const INITIAL_FORM = {
  assignmentId: "",
  scopeType: "GROUP",
  participantId: "",
  accessType: "ACCESS_CODE",
  expiresAt: "",
};

const AccessCredentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [credentialResponse, assignmentResponse, participantResponse] =
        await Promise.all([
          api.get("/access-credentials"),
          api.get("/assignments"),
          api.get("/participants"),
        ]);

      setCredentials(credentialResponse.data?.credentials || []);
      setAssignments(assignmentResponse.data?.assignments || []);
      setParticipants(participantResponse.data?.participants || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load access credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedAssignment = useMemo(
    () =>
      assignments.find(
        (item) => item._id === formData.assignmentId
      ),
    [assignments, formData.assignmentId]
  );

  const eligibleParticipants = useMemo(() => {
    const groupId =
      selectedAssignment?.groupId?._id ||
      selectedAssignment?.groupId;

    return participants.filter(
      (participant) =>
        participant.status === "ACTIVE" &&
        (participant.groupId?._id ||
          participant.groupId) === groupId
    );
  }, [participants, selectedAssignment]);

  const getAssignment = (credential) => {
    const id =
      credential.assignmentId?._id ||
      credential.assignmentId;

    return (
      assignments.find((item) => item._id === id) ||
      credential.assignmentId
    );
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
  };

  const openCreate = () => {
    setError("");
    setSuccess("");
    resetForm();
    setModalOpen(true);
  };

  const closeCreate = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.assignmentId) {
      setError("Please select an assignment.");
      return;
    }

    if (
      formData.scopeType === "PARTICIPANT" &&
      !formData.participantId
    ) {
      setError(
        "Please select a participant for individual access."
      );
      return;
    }

    const responseMode =
      selectedAssignment?.formId?.responseMode;

    if (
      formData.scopeType === "GROUP" &&
      responseMode === "IDENTIFIED" &&
      formData.accessType !== "LOGIN"
    ) {
      setError(
        "Identified feedback for an entire group requires Login access."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        assignmentId: formData.assignmentId,
        scopeType: formData.scopeType,
        accessType: formData.accessType,
      };

      if (formData.scopeType === "PARTICIPANT") {
        payload.participantId = formData.participantId;
      }

      if (formData.expiresAt) {
        payload.expiresAt = new Date(
          formData.expiresAt
        ).toISOString();
      }

      const response = await api.post(
        "/access-credentials",
        payload
      );

      setGenerated(response.data?.credentials || []);
      setGeneratedOpen(true);
      setModalOpen(false);
      resetForm();

      setSuccess(
        response.data?.message ||
          "Access created successfully."
      );

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create access."
      );
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (credential) => {
    if (
      !window.confirm(
        "Revoke this access credential?"
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.patch(
        `/access-credentials/${credential._id}/revoke`
      );
      setSuccess(
        "Access credential revoked successfully."
      );
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to revoke access credential."
      );
    }
  };

  const copy = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setSuccess("Copied to clipboard.");
    } catch {
      window.prompt("Copy this value:", value);
    }
  };

  const getMethodLabel = (type) =>
    ({
      LOGIN: "Login",
      ACCESS_CODE: "Access Code",
      UNIQUE_LINK: "Unique Link",
      QR: "QR Code",
    }[type] || type);

  const assignmentLabel = (assignment) =>
    `${assignment.formId?.title || "Feedback Form"} — ${
      assignment.groupId?.name || "Group"
    }`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Access Credentials</h1>
          <p>
            Configure login, group access or individual access
            for assigned feedback.
          </p>
        </div>

        <Button onClick={openCreate}>
          + Configure Access
        </Button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && (
        <div className="success-box">{success}</div>
      )}

      {loading ? (
        <Loading />
      ) : credentials.length === 0 ? (
        <EmptyState
          title="No access configured"
          description="Configure login, an access code, a unique link or a QR code for an active assignment."
          action={
            <Button onClick={openCreate}>
              Configure Access
            </Button>
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Feedback Form</th>
                  <th>Group</th>
                  <th>Scope</th>
                  <th>Method</th>
                  <th>Participant</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {credentials.map((credential) => {
                  const assignment =
                    getAssignment(credential);

                  const participantName =
                    credential.participantId?.name ||
                    credential.participantName ||
                    (credential.accessType === "LOGIN"
                      ? "Participant Login"
                      : "—");

                  return (
                    <tr key={credential._id}>
                      <td>
                        <strong>
                          {assignment?.formId?.title ||
                            "—"}
                        </strong>
                      </td>

                      <td>
                        {assignment?.groupId?.name ||
                          "—"}
                      </td>

                      <td>
                        {credential.scopeType ===
                        "GROUP"
                          ? "Entire Group"
                          : "Individual"}
                      </td>

                      <td>
                        {getMethodLabel(
                          credential.accessType
                        )}
                      </td>

                      <td>{participantName}</td>

                      <td>
                        {credential.accessType ===
                        "LOGIN" ? (
                          <span className="table-subtext">
                            Login with participant
                            account
                          </span>
                        ) : credential.accessCode ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              copy(
                                credential.accessCode
                              )
                            }
                          >
                            Copy Code
                          </Button>
                        ) : credential.accessUrl ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              copy(
                                credential.accessUrl
                              )
                            }
                          >
                            Copy Link
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <Badge
                          status={
                            credential.status
                          }
                        />
                      </td>

                      <td>
                        {credential.expiresAt
                          ? new Date(
                              credential.expiresAt
                            ).toLocaleString(
                              "en-IN"
                            )
                          : "No expiry"}
                      </td>

                      <td>
                        <div className="table-actions">
                          <ViewDetailsButton
                            item={credential}
                          />

                          {credential.status ===
                            "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                revoke(
                                  credential
                                )
                              }
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Configure Feedback Access"
        onClose={closeCreate}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeCreate}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="access-form"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Access"}
            </Button>
          </>
        }
      >
        <form
          id="access-form"
          onSubmit={handleSubmit}
        >
          <Select
            label="Assignment"
            value={formData.assignmentId}
            onChange={(event) =>
              setFormData({
                ...formData,
                assignmentId:
                  event.target.value,
                participantId: "",
              })
            }
            required
          >
            <option value="">
              Select assignment
            </option>

            {assignments
              .filter(
                (assignment) =>
                  assignment.status === "ACTIVE"
              )
              .map((assignment) => (
                <option
                  key={assignment._id}
                  value={assignment._id}
                >
                  {assignmentLabel(
                    assignment
                  )}
                </option>
              ))}
          </Select>

          {selectedAssignment && (
            <div className="info-box">
              <strong>
                {
                  selectedAssignment.formId
                    ?.title
                }
              </strong>
              <p>
                Response mode:{" "}
                {
                  selectedAssignment.formId
                    ?.responseMode
                }{" "}
                · Multiple responses:{" "}
                {selectedAssignment.formId
                  ?.allowMultipleResponses
                  ? "Yes"
                  : "No"}
              </p>
            </div>
          )}

          <Select
            label="Access Scope"
            value={formData.scopeType}
            onChange={(event) =>
              setFormData({
                ...formData,
                scopeType:
                  event.target.value,
                participantId: "",
              })
            }
            required
          >
            <option value="GROUP">
              Entire Group
            </option>
            <option value="PARTICIPANT">
              Individual Participant
            </option>
          </Select>

          {formData.scopeType ===
            "PARTICIPANT" && (
            <Select
              label="Participant"
              value={
                formData.participantId
              }
              onChange={(event) =>
                setFormData({
                  ...formData,
                  participantId:
                    event.target.value,
                })
              }
              required
            >
              <option value="">
                Select participant
              </option>

              {eligibleParticipants.map(
                (participant) => (
                  <option
                    key={participant._id}
                    value={
                      participant._id
                    }
                  >
                    {participant.name} —{" "}
                    {participant.externalId}
                  </option>
                )
              )}
            </Select>
          )}

          <Select
            label="Access Method"
            value={formData.accessType}
            onChange={(event) =>
              setFormData({
                ...formData,
                accessType:
                  event.target.value,
              })
            }
            required
          >
            {ACCESS_TYPES.map(
              (method) => (
                <option
                  key={method.value}
                  value={method.value}
                >
                  {method.label}
                </option>
              )
            )}
          </Select>

          {selectedAssignment?.formId
            ?.responseMode ===
            "IDENTIFIED" &&
            formData.scopeType ===
              "GROUP" &&
            formData.accessType !==
              "LOGIN" && (
              <div className="field-error">
                Identified feedback for a group
                requires Login access.
              </div>
            )}

          {selectedAssignment?.formId
            ?.responseMode ===
            "ANONYMOUS" &&
            formData.scopeType ===
              "GROUP" &&
            !selectedAssignment.formId
              ?.allowMultipleResponses && (
              <div className="info-box">
                <strong>
                  Shared anonymous access
                </strong>
                <p>
                  A shared anonymous code cannot
                  know which participant has already
                  submitted. The system therefore
                  allows each valid access session to
                  submit while keeping identity hidden.
                </p>
              </div>
            )}

          <div className="form-field">
            <label htmlFor="access-expiry">
              Expiry (optional)
            </label>

            <input
              id="access-expiry"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  expiresAt:
                    event.target.value,
                })
              }
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={generatedOpen}
        title="Access Created"
        onClose={() => setGeneratedOpen(false)}
        footer={
          <Button
            variant="secondary"
            onClick={() =>
              setGeneratedOpen(false)
            }
          >
            Close
          </Button>
        }
      >
        <div className="generated-access-list">
          {generated.map((credential) => (
            <div
              className="generated-access-item"
              key={String(credential.id)}
            >
              <div>
                <strong>
                  {credential.participantName ||
                    "Group Access"}
                </strong>
                <p>
                  {getMethodLabel(
                    credential.accessType
                  )}
                </p>
              </div>

              {credential.accessType ===
              "LOGIN" ? (
                <div className="credential-value">
                  Login with the participant's
                  normal email and password.
                </div>
              ) : credential.accessCode ? (
                <div className="generated-access-value">
                  <code>
                    {credential.accessCode}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      copy(
                        credential.accessCode
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              ) : credential.accessUrl ? (
                <div className="generated-access-value">
                  <input
                    readOnly
                    value={
                      credential.accessUrl
                    }
                    aria-label="Generated access link"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      copy(
                        credential.accessUrl
                      )
                    }
                  >
                    Copy
                  </Button>

                  {credential.accessType ===
                    "QR" && (
                    <div className="qr-preview">
                      <QRCodeSVG
                        value={
                          credential.accessUrl
                        }
                        size={150}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span>Created</span>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default AccessCredentials;
