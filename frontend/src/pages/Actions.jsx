import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const INITIAL_FORM = {
  issue: "",
  action: "",
  assignedTo: "",
  priority: "MEDIUM",
  dueDate: "",
};

const PRIORITIES = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
  ["CRITICAL", "Critical"],
];

const Actions = () => {
  const { user } = useAuth();

  const isOrgAdmin = user?.role === "ORG_ADMIN";
  const isManager = user?.role === "MANAGER";

  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM);

  /*
   * =========================================================
   * FETCH ACTIONS
   * =========================================================
   */

  const fetchActions = async () => {
    const response = await api.get("/actions");

    setActions(response.data?.actions || []);
  };

  /*
   * =========================================================
   * FETCH USERS
   * =========================================================
   */

  const fetchUsers = async () => {
    if (!isOrgAdmin) {
      setUsers([]);
      return;
    }

    const response = await api.get("/organizations/users");

    const allUsers = response.data?.users || [];

    /*
     * Only users who can own improvement actions.
     * This matches the backend authorization.
     */
    const actionOwners = allUsers.filter(
      (item) =>
        item.status === "ACTIVE" &&
        (item.role === "ORG_ADMIN" ||
          item.role === "MANAGER")
    );

    setUsers(actionOwners);
  };

  /*
   * =========================================================
   * LOAD PAGE
   * =========================================================
   */

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchActions(),
        fetchUsers(),
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load improvement actions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [isOrgAdmin]);

  /*
   * =========================================================
   * HANDLE INPUT
   * =========================================================
   */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /*
   * =========================================================
   * OPEN CREATE MODAL
   * =========================================================
   */

  const openCreateModal = () => {
    setEditingAction(null);
    setFormData({ ...INITIAL_FORM });

    setError("");
    setSuccess("");

    setModalOpen(true);
  };

  /*
   * =========================================================
   * OPEN EDIT MODAL
   * =========================================================
   */

  const openEditModal = (item) => {
    if (!isOrgAdmin) return;

    setEditingAction(item);

    setFormData({
      issue: item.issue || "",
      action:
        item.action ||
        item.title ||
        "",
      assignedTo:
        item.assignedTo?._id ||
        item.assignedTo ||
        "",
      priority:
        item.priority ||
        "MEDIUM",
      dueDate: item.dueDate
        ? new Date(item.dueDate)
            .toISOString()
            .substring(0, 10)
        : "",
    });

    setError("");
    setSuccess("");

    setModalOpen(true);
  };

  /*
   * =========================================================
   * CLOSE MODAL
   * =========================================================
   */

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingAction(null);
    setFormData({ ...INITIAL_FORM });
  };

  /*
   * =========================================================
   * VALIDATE FORM
   * =========================================================
   */

  const validateForm = () => {
    if (!formData.issue.trim()) {
      return "Issue is required.";
    }

    if (formData.issue.trim().length > 1000) {
      return "Issue cannot exceed 1000 characters.";
    }

    if (!formData.action.trim()) {
      return "Action is required.";
    }

    if (formData.action.trim().length > 1000) {
      return "Action cannot exceed 1000 characters.";
    }

    if (
      !PRIORITIES.some(
        ([value]) => value === formData.priority
      )
    ) {
      return "Please select a valid priority.";
    }

    return "";
  };

  /*
   * =========================================================
   * CREATE / UPDATE ACTION
   * =========================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isOrgAdmin) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        issue: formData.issue.trim(),
        action: formData.action.trim(),
        assignedTo:
          formData.assignedTo || null,
        priority: formData.priority,
        dueDate:
          formData.dueDate || null,
      };

      if (editingAction) {
        await api.patch(
          `/actions/${editingAction._id}`,
          payload
        );

        setSuccess(
          "Improvement action updated successfully."
        );
      } else {
        await api.post(
          "/actions",
          payload
        );

        setSuccess(
          "Improvement action created successfully."
        );
      }

      setModalOpen(false);
      setEditingAction(null);
      setFormData({ ...INITIAL_FORM });

      await fetchActions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save improvement action."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * UPDATE STATUS
   * =========================================================
   */

  const updateStatus = async (id, status) => {
    try {
      setUpdatingStatus(id);
      setError("");
      setSuccess("");

      await api.patch(
        `/actions/${id}/status`,
        { status }
      );

      setSuccess(
        "Action status updated successfully."
      );

      await fetchActions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update action status."
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  /*
   * =========================================================
   * FORMAT DATE
   * =========================================================
   */

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /*
   * =========================================================
   * OWNER NAME
   * =========================================================
   */

  const getOwnerName = (item) => {
    if (item.assignedTo?.name) {
      return item.assignedTo.name;
    }

    if (item.assignedTo?.email) {
      return item.assignedTo.email;
    }

    return "Unassigned";
  };

  /*
   * =========================================================
   * PRIORITY BADGE
   * =========================================================
   */

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "danger";

      case "HIGH":
        return "warning";

      case "MEDIUM":
        return "info";

      case "LOW":
        return "success";

      default:
        return "info";
    }
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return <Loading />;
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="page">

      {/* PAGE HEADER */}
      <div className="page-head">
        <div>
          <h1>
            {isManager
              ? "My Assigned Actions"
              : "Improvement Actions"}
          </h1>

          <p>
            {isManager
              ? "Review and update improvement actions assigned to you."
              : "Create, assign and track improvement actions from feedback."}
          </p>
        </div>

        {isOrgAdmin && (
          <Button onClick={openCreateModal}>
            + Create Action
          </Button>
        )}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="success-box">
          {success}
        </div>
      )}

      {/* ACTION TABLE / EMPTY STATE */}
      {actions.length === 0 ? (
        <EmptyState
          title={
            isManager
              ? "No assigned actions"
              : "No actions found"
          }
          description={
            isManager
              ? "There are no improvement actions currently assigned to you."
              : "Create an improvement action based on feedback."
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>

              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Action</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {actions.map((item) => (
                  <tr key={item._id}>

                    {/* ISSUE */}
                    <td>
                      <strong>
                        {item.issue ||
                          item.title ||
                          "—"}
                      </strong>
                    </td>

                    {/* ACTION */}
                    <td>
                      <strong>
                        {item.action ||
                          item.title ||
                          "—"}
                      </strong>

                      {item.description && (
                        <div className="table-subtext">
                          {item.description}
                        </div>
                      )}
                    </td>

                    {/* OWNER */}
                    <td>
                      {getOwnerName(item)}
                    </td>

                    {/* PRIORITY */}
                    <td>
                      <Badge
                        variant={getPriorityVariant(
                          item.priority
                        )}
                      >
                        {item.priority || "MEDIUM"}
                      </Badge>
                    </td>

                    {/* DUE DATE */}
                    <td>
                      {formatDate(
                        item.dueDate
                      )}
                    </td>

                    {/* STATUS */}
                    <td>
                      <Badge
                        status={item.status}
                      />
                    </td>

                    {/* ACTION BUTTONS */}
                    <td>
                      <div className="table-actions">
                        <ViewDetailsButton item={item} />

                        {isOrgAdmin && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEditModal(item)
                            }
                            disabled={
                              updatingStatus ===
                              item._id
                            }
                          >
                            Edit
                          </Button>
                        )}

                        {item.status ===
                          "OPEN" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              updateStatus(
                                item._id,
                                "IN_PROGRESS"
                              )
                            }
                            disabled={
                              updatingStatus ===
                              item._id
                            }
                          >
                            {updatingStatus ===
                            item._id
                              ? "Updating..."
                              : "Start"}
                          </Button>
                        )}

                        {item.status ===
                          "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus(
                                item._id,
                                "COMPLETED"
                              )
                            }
                            disabled={
                              updatingStatus ===
                              item._id
                            }
                          >
                            {updatingStatus ===
                            item._id
                              ? "Updating..."
                              : "Complete"}
                          </Button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={
          editingAction
            ? "Edit Improvement Action"
            : "Create Improvement Action"
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
              form="action-form"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingAction
                ? "Update Action"
                : "Create Action"}
            </Button>
          </>
        }
      >

        <form
          id="action-form"
          onSubmit={handleSubmit}
        >

          {/* ISSUE */}
          <Input
            label="Issue"
            name="issue"
            value={formData.issue}
            onChange={handleChange}
            placeholder="Describe the issue identified from feedback"
            required
            maxLength={1000}
          />

          {/* ACTION */}
          <Input
            label="Action"
            name="action"
            value={formData.action}
            onChange={handleChange}
            placeholder="Describe the improvement action"
            required
            maxLength={1000}
          />

          {/* OWNER */}
          <Select
            label="Owner"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
          >
            <option value="">
              Unassigned
            </option>

            {users.map((owner) => (
              <option
                key={owner._id}
                value={owner._id}
              >
                {owner.name} — {owner.role}
              </option>
            ))}
          </Select>

          {/* PRIORITY */}
          <Select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
          >
            {PRIORITIES.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </Select>

          {/* DUE DATE */}
          <Input
            label="Due Date"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={handleChange}
          />

        </form>

      </Modal>
    </div>
  );
};

export default Actions;
