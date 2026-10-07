import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const INITIAL_FORM = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  responseMode: "IDENTIFIED",
  allowMultipleResponses: false,
  confirmationMessage: "Thank you for your feedback.",
};

const FeedbackForms = () => {
  const navigate = useNavigate();

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState(INITIAL_FORM);

  /**
   * FETCH FORMS
   */
  const fetchForms = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/feedback-forms");

      const data = res.data;

      const list =
        data.items ||
        data.data ||
        data.forms ||
        [];

      setForms(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load feedback forms."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  /**
   * RESET FORM
   */
  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM,
    });

    setEditingForm(null);
    setValidationErrors({});
  };

  /**
   * OPEN CREATE
   */
  const openCreateModal = () => {
    resetForm();
    setError("");
    setModalOpen(true);
  };

  /**
   * CONVERT DATE TO INPUT FORMAT
   *
   * We intentionally use local date/time instead of
   * toISOString() so the displayed value does not
   * shift because of timezone conversion.
   */
  const toDateTimeLocal = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (number) =>
      String(number).padStart(2, "0");

    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  /**
   * OPEN EDIT
   */
  const openEditModal = (form) => {
    // Closed and archived forms should not be edited.
    if (
      form.status === "CLOSED" ||
      form.status === "ARCHIVED"
    ) {
      setError(
        "Closed or archived feedback forms cannot be edited."
      );
      return;
    }

    setEditingForm(form);

    setFormData({
      title: form.title || "",
      description: form.description || "",
      startDate: toDateTimeLocal(form.startDate),
      endDate: toDateTimeLocal(form.endDate),
      responseMode:
        form.responseMode || "IDENTIFIED",
      allowMultipleResponses: Boolean(
        form.allowMultipleResponses
      ),
      confirmationMessage:
        form.confirmationMessage ||
        "Thank you for your feedback.",
    });

    setValidationErrors({});
    setError("");
    setModalOpen(true);
  };

  /**
   * HANDLE CHANGE
   */
  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  /**
   * VALIDATE FORM
   */
  const validateForm = () => {
    const errors = {};

    const title = formData.title.trim();
    const description =
      formData.description.trim();
    const confirmationMessage =
      formData.confirmationMessage.trim();

    /**
     * TITLE
     */
    if (!title) {
      errors.title =
        "Form title is required.";
    } else if (title.length > 200) {
      errors.title =
        "Form title cannot exceed 200 characters.";
    }

    /**
     * DESCRIPTION
     */
    if (description.length > 1000) {
      errors.description =
        "Description cannot exceed 1000 characters.";
    }

    /**
     * DATES
     */
    if (!formData.startDate) {
      errors.startDate =
        "Start date and time is required.";
    }

    if (!formData.endDate) {
      errors.endDate =
        "End date and time is required.";
    }

    if (
      formData.startDate &&
      formData.endDate
    ) {
      const start = new Date(
        formData.startDate
      );

      const end = new Date(
        formData.endDate
      );

      if (
        Number.isNaN(start.getTime())
      ) {
        errors.startDate =
          "Invalid start date and time.";
      }

      if (
        Number.isNaN(end.getTime())
      ) {
        errors.endDate =
          "Invalid end date and time.";
      }

      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        start >= end
      ) {
        errors.endDate =
          "End date and time must be after start date and time.";
      }
    }

    /**
     * RESPONSE MODE
     */
    if (
      !["IDENTIFIED", "ANONYMOUS"].includes(
        formData.responseMode
      )
    ) {
      errors.responseMode =
        "Invalid response mode.";
    }

    /**
     * CONFIRMATION MESSAGE
     */
    if (confirmationMessage.length > 500) {
      errors.confirmationMessage =
        "Confirmation message cannot exceed 500 characters.";
    }

    setValidationErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /**
   * CREATE / UPDATE
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: formData.title.trim(),

        description:
          formData.description.trim(),

        startDate:
          new Date(
            formData.startDate
          ).toISOString(),

        endDate:
          new Date(
            formData.endDate
          ).toISOString(),

        responseMode:
          formData.responseMode,

        allowMultipleResponses:
          Boolean(
            formData.allowMultipleResponses
          ),

        confirmationMessage:
          formData.confirmationMessage.trim(),
      };

      if (editingForm) {
        await api.patch(
          `/feedback-forms/${editingForm._id}`,
          payload
        );
      } else {
        await api.post(
          "/feedback-forms",
          payload
        );
      }

      setModalOpen(false);
      resetForm();

      await fetchForms();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save feedback form."
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * CHANGE FORM STATUS
   *
   * Supported lifecycle:
   *
   * DRAFT -> PUBLISHED
   * PUBLISHED -> ACTIVE
   * ACTIVE -> CLOSED
   * CLOSED -> ARCHIVED
   */
  const updateStatus = async (
    form,
    nextStatus
  ) => {
    try {
      setError("");

      await api.patch(
        `/feedback-forms/${form._id}/status`,
        {
          status: nextStatus,
        }
      );

      await fetchForms();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update form status."
      );
    }
  };

  /**
   * STATUS ACTION
   */
  const handleStatusAction = async (
    form
  ) => {
    let nextStatus = null;

    if (form.status === "DRAFT") {
      nextStatus = "PUBLISHED";
    } else if (
      form.status === "PUBLISHED"
    ) {
      nextStatus = "ACTIVE";
    } else if (
      form.status === "ACTIVE"
    ) {
      nextStatus = "CLOSED";
    } else if (
      form.status === "CLOSED"
    ) {
      nextStatus = "ARCHIVED";
    }

    if (!nextStatus) {
      return;
    }

    const confirmationMessage = {
      PUBLISHED:
        "Publish this feedback form?",
      ACTIVE:
        "Activate this feedback form?",
      CLOSED:
        "Close this feedback form?",
      ARCHIVED:
        "Archive this feedback form?",
    };

    if (
      confirmationMessage[nextStatus] &&
      !window.confirm(
        confirmationMessage[nextStatus]
      )
    ) {
      return;
    }

    await updateStatus(
      form,
      nextStatus
    );
  };

  /**
   * STATUS BADGE
   *
   * Keep compatibility with the existing
   * Badge component.
   */
  const getStatusVariant = (
    status
  ) => {
    switch (status) {
      case "ACTIVE":
        return "success";

      case "PUBLISHED":
        return "info";

      case "CLOSED":
        return "warning";

      case "ARCHIVED":
        return "danger";

      case "DRAFT":
      default:
        return "default";
    }
  };

  /**
   * STATUS BUTTON TEXT
   */
  const getStatusActionText = (
    status
  ) => {
    switch (status) {
      case "DRAFT":
        return "Publish";

      case "PUBLISHED":
        return "Activate";

      case "ACTIVE":
        return "Close";

      case "CLOSED":
        return "Archive";

      default:
        return null;
    }
  };

  /**
   * FORMAT DATE
   */
  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleString();
  };

  /**
   * CLOSE MODAL
   */
  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    resetForm();
  };

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-head">
        <div>
          <h1>Feedback Forms</h1>

          <p>
            Create and manage feedback forms
            for your organization.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
        >
          + Create Form
        </Button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <Loading />
      ) : forms.length === 0 ? (
        <EmptyState
          title="No feedback forms found"
          message="Create your first feedback form to get started."
          action={
            <Button
              onClick={openCreateModal}
            >
              Create Form
            </Button>
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Response Mode</th>
                  <th>
                    Multiple Responses
                  </th>
                  <th>
                    Start Date
                  </th>
                  <th>
                    End Date
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {forms.map((form) => {
                  const statusAction =
                    getStatusActionText(
                      form.status
                    );

                  return (
                    <tr
                      key={form._id}
                    >
                      {/* TITLE */}
                      <td>
                        <strong>
                          {form.title}
                        </strong>

                        {form.description && (
                          <div className="table-subtext">
                            {
                              form.description
                            }
                          </div>
                        )}
                      </td>

                      {/* RESPONSE MODE */}
                      <td>
                        {form.responseMode ===
                        "ANONYMOUS"
                          ? "Anonymous"
                          : "Identified"}
                      </td>

                      {/* MULTIPLE */}
                      <td>
                        {form.allowMultipleResponses
                          ? "Yes"
                          : "No"}
                      </td>

                      {/* START */}
                      <td>
                        {formatDate(
                          form.startDate
                        )}
                      </td>

                      {/* END */}
                      <td>
                        {formatDate(
                          form.endDate
                        )}
                      </td>

                      {/* STATUS */}
                      <td>
                        <Badge
                          variant={getStatusVariant(
                            form.status
                          )}
                        >
                          {form.status}
                        </Badge>
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div className="table-actions">
                          <ViewDetailsButton item={form} />
                          {/* EDIT */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEditModal(
                                form
                              )
                            }
                            disabled={
                              form.status ===
                                "CLOSED" ||
                              form.status ===
                                "ARCHIVED"
                            }
                          >
                            Edit
                          </Button>

                          {/* LIFECYCLE ACTION */}
                          {statusAction && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleStatusAction(
                                  form
                                )
                              }
                            >
                              {
                                statusAction
                              }
                            </Button>
                          )}

                          {/* QUESTIONS */}
                          <Button
                            size="sm"
                            onClick={() => {
                              navigate(
                                `/questions?formId=${form._id}`
                              );
                            }}
                          >
                            Questions
                          </Button>
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

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={
          editingForm
            ? "Edit Feedback Form"
            : "Create Feedback Form"
        }
        onClose={closeModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="feedback-form"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingForm
                ? "Update Form"
                : "Create Form"}
            </Button>
          </>
        }
      >
        <form
          id="feedback-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            {/* TITLE */}
            <Input
              label="Form Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter feedback form title"
              required
              maxLength={200}
              error={
                validationErrors.title
              }
            />

            {/* DESCRIPTION */}
            <Input
              label="Description"
              name="description"
              value={
                formData.description
              }
              onChange={handleChange}
              placeholder="Enter form description"
              maxLength={1000}
              error={
                validationErrors.description
              }
            />

            {/* START DATE */}
            <Input
              label="Start Date"
              type="datetime-local"
              name="startDate"
              value={
                formData.startDate
              }
              onChange={handleChange}
              required
              error={
                validationErrors.startDate
              }
            />

            {/* END DATE */}
            <Input
              label="End Date"
              type="datetime-local"
              name="endDate"
              value={
                formData.endDate
              }
              onChange={handleChange}
              required
              error={
                validationErrors.endDate
              }
            />

            {/* RESPONSE MODE */}
            <Select
              label="Response Mode"
              name="responseMode"
              value={
                formData.responseMode
              }
              onChange={handleChange}
              required
              error={
                validationErrors.responseMode
              }
            >
              <option value="IDENTIFIED">
                Identified
              </option>

              <option value="ANONYMOUS">
                Anonymous
              </option>
            </Select>

            {/* RESPONSE SETTINGS */}
            <div className="form-field">
              <label>
                Response Settings
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="allowMultipleResponses"
                  checked={
                    formData.allowMultipleResponses
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                  Allow multiple
                  responses
                </span>
              </label>
            </div>

            {/* CONFIRMATION */}
            <Input
              label="Confirmation Message"
              name="confirmationMessage"
              value={
                formData.confirmationMessage
              }
              onChange={handleChange}
              placeholder="Message shown after submission"
              maxLength={500}
              error={
                validationErrors.confirmationMessage
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeedbackForms;
