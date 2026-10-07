import { useEffect, useState } from "react";
import api from "../services/api";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingGroup, setEditingGroup] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    departmentId: "",
  });

  const [formErrors, setFormErrors] =
    useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        groupsResponse,
        departmentsResponse,
      ] = await Promise.all([
        api.get("/groups"),
        api.get("/departments"),
      ]);

      const groupsData =
        groupsResponse.data;

      const departmentsData =
        departmentsResponse.data;

      setGroups(
        groupsData?.groups ||
          groupsData?.items ||
          groupsData?.data ||
          []
      );

      setDepartments(
        departmentsData?.departments ||
          departmentsData?.items ||
          departmentsData?.data ||
          []
      );
    } catch (err) {
      setGroups([]);
      setDepartments([]);

      setError(
        err.response?.data?.message ||
          "Unable to load groups."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      departmentId: "",
    });

    setFormErrors({});
    setEditingGroup(null);
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (group) => {
    setEditingGroup(group);

    setForm({
      name: group.name || "",
      description: group.description || "",
      departmentId:
        group.departmentId?._id ||
        group.departmentId ||
        "",
    });

    setFormErrors({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  };

  const handleChange = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validate = () => {
    const errors = {};

    const name = form.name.trim();
    const description =
      form.description.trim();

    if (!name) {
      errors.name =
        "Group name is required.";
    } else if (name.length < 2) {
      errors.name =
        "Group name must contain at least 2 characters.";
    } else if (name.length > 100) {
      errors.name =
        "Group name cannot exceed 100 characters.";
    }

    if (description.length > 500) {
      errors.description =
        "Description cannot exceed 500 characters.";
    }

    if (!form.departmentId) {
      errors.departmentId =
        "Department is required.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description:
          form.description.trim(),
        departmentId: form.departmentId,
      };

      if (editingGroup) {
        await api.patch(
          `/groups/${editingGroup._id}`,
          payload
        );

        setSuccess(
          "Group updated successfully."
        );
      } else {
        await api.post(
          "/groups",
          payload
        );

        setSuccess(
          "Group created successfully."
        );
      }

      setModalOpen(false);
      resetForm();

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save group."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (group) => {
    const nextStatus =
      group.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    const confirmed = window.confirm(
      `${
        nextStatus === "ACTIVE"
          ? "Activate"
          : "Deactivate"
      } ${group.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatusUpdatingId(group._id);
      setError("");
      setSuccess("");

      await api.patch(
        `/groups/${group._id}/status`,
        {
          status: nextStatus,
        }
      );

      setSuccess(
        `Group ${
          nextStatus === "ACTIVE"
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update group status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getDepartmentName = (group) => {
    if (group.departmentId?.name) {
      return group.departmentId.name;
    }

    const department = departments.find(
      (item) =>
        item._id ===
        (group.departmentId?._id ||
          group.departmentId)
    );

    return department?.name || "—";
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Groups</h1>
          <p>
            Manage groups within your
            organization and associate them
            with departments.
          </p>
        </div>

        <Button onClick={openCreate}>
          + Create
        </Button>
      </div>

      {error && !modalOpen && (
        <div className="error-box">
          {error}
        </div>
      )}

      {success && !modalOpen && (
        <div className="success-box">
          {success}
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <Loading />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Create your first group to get started."
            action={
              <Button onClick={openCreate}>
                + Create
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {groups.map((group) => (
                  <tr key={group._id}>
                    <td>{group.name}</td>

                    <td>
                      {getDepartmentName(
                        group
                      )}
                    </td>

                    <td>
                      {group.description ||
                        "—"}
                    </td>

                    <td>
                      <Badge
                        status={
                          group.status
                        }
                      />
                    </td>

                    <td>
                      <div className="table-actions">
                        <ViewDetailsButton item={group} />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            statusUpdatingId ===
                            group._id
                          }
                          onClick={() =>
                            openEdit(group)
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant={
                            group.status ===
                            "ACTIVE"
                              ? "danger"
                              : "secondary"
                          }
                          disabled={
                            statusUpdatingId ===
                            group._id
                          }
                          onClick={() =>
                            toggleStatus(
                              group
                            )
                          }
                        >
                          {statusUpdatingId ===
                          group._id
                            ? "Updating..."
                            : group.status ===
                              "ACTIVE"
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={
          editingGroup
            ? "Edit Group"
            : "Create Group"
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
              form="group-form"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingGroup
                ? "Update"
                : "Create"}
            </Button>
          </>
        }
      >
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          id="group-form"
          onSubmit={handleSubmit}
          className="form-grid"
          noValidate
        >
          <Input
            label="Group Name"
            name="name"
            value={form.name}
            placeholder="Enter group name"
            required
            maxLength={100}
            disabled={saving}
            error={formErrors.name}
            onChange={(event) =>
              handleChange(
                "name",
                event.target.value
              )
            }
          />

          <Select
            label="Department"
            name="departmentId"
            value={form.departmentId}
            required
            disabled={saving}
            error={
              formErrors.departmentId
            }
            onChange={(event) =>
              handleChange(
                "departmentId",
                event.target.value
              )
            }
          >
            <option value="">
              Select Department
            </option>

            {departments
              .filter(
                (department) =>
                  department.status ===
                  "ACTIVE" ||
                  department._id ===
                    form.departmentId
              )
              .map((department) => (
                <option
                  key={department._id}
                  value={department._id}
                >
                  {department.name}
                </option>
              ))}
          </Select>

          <Input
            label="Description"
            name="description"
            value={form.description}
            placeholder="Enter a short description"
            maxLength={500}
            disabled={saving}
            error={
              formErrors.description
            }
            onChange={(event) =>
              handleChange(
                "description",
                event.target.value
              )
            }
          />
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
