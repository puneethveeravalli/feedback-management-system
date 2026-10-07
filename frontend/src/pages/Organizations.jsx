import { useEffect, useState } from "react";
import api from "../services/api";

import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const initialOrganizationForm = {
  name: "",
  description: "",
};

const initialAdminForm = {
  name: "",
  email: "",
  password: "",
};

const Organizations = () => {
  /*
  |--------------------------------------------------------------------------
  | ORGANIZATIONS
  |--------------------------------------------------------------------------
  */

  const [organizations, setOrganizations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION FORM
  |--------------------------------------------------------------------------
  */

  const [
    showOrganizationModal,
    setShowOrganizationModal,
  ] = useState(false);

  const [
    editingOrganization,
    setEditingOrganization,
  ] = useState(null);

  const [
    organizationForm,
    setOrganizationForm,
  ] = useState(
    initialOrganizationForm
  );

  const [
    organizationSaving,
    setOrganizationSaving,
  ] = useState(false);

  const [
    organizationFormError,
    setOrganizationFormError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION STATUS
  |--------------------------------------------------------------------------
  */

  const [
    statusLoading,
    setStatusLoading,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | ADMIN MODAL
  |--------------------------------------------------------------------------
  */

  const [
    showAdminModal,
    setShowAdminModal,
  ] = useState(false);

  const [
    selectedOrganization,
    setSelectedOrganization,
  ] = useState(null);

  const [
    organizationAdmins,
    setOrganizationAdmins,
  ] = useState([]);

  const [
    adminsLoading,
    setAdminsLoading,
  ] = useState(false);

  const [
    adminSaving,
    setAdminSaving,
  ] = useState(false);

  const [
    adminForm,
    setAdminForm,
  ] = useState(initialAdminForm);

  const [
    adminFormError,
    setAdminFormError,
  ] = useState("");

  const [
    adminStatusLoading,
    setAdminStatusLoading,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | FETCH ORGANIZATIONS
  |--------------------------------------------------------------------------
  */

  const fetchOrganizations =
    async () => {
      try {
        setLoading(true);
        setPageError("");

        const response =
          await api.get(
            "/organizations"
          );

        setOrganizations(
          response.data?.organizations ||
            []
        );
      } catch (err) {
        console.error(
          "Failed to fetch organizations:",
          err
        );

        setPageError(
          err.response?.data?.message ||
            "Failed to load organizations."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CREATE ORGANIZATION
  |--------------------------------------------------------------------------
  */

  const openCreateOrganization =
    () => {
      setEditingOrganization(null);

      setOrganizationForm(
        initialOrganizationForm
      );

      setOrganizationFormError("");

      setShowOrganizationModal(true);
    };

  /*
  |--------------------------------------------------------------------------
  | EDIT ORGANIZATION
  |--------------------------------------------------------------------------
  */

  const openEditOrganization =
    (organization) => {
      setEditingOrganization(
        organization
      );

      setOrganizationForm({
        name:
          organization?.name || "",
        description:
          organization?.description ||
          "",
      });

      setOrganizationFormError("");

      setShowOrganizationModal(true);
    };

  /*
  |--------------------------------------------------------------------------
  | CLOSE ORGANIZATION MODAL
  |--------------------------------------------------------------------------
  */

  const closeOrganizationModal =
    () => {
      if (organizationSaving) {
        return;
      }

      setShowOrganizationModal(false);

      setEditingOrganization(null);

      setOrganizationForm(
        initialOrganizationForm
      );

      setOrganizationFormError("");
    };

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION INPUT
  |--------------------------------------------------------------------------
  */

  const handleOrganizationChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setOrganizationForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      if (organizationFormError) {
        setOrganizationFormError("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateOrganization =
    () => {
      const name =
        organizationForm.name.trim();

      const description =
        organizationForm.description.trim();

      if (!name) {
        setOrganizationFormError(
          "Organization name is required."
        );
        return false;
      }

      if (name.length < 2) {
        setOrganizationFormError(
          "Organization name must contain at least 2 characters."
        );
        return false;
      }

      if (name.length > 100) {
        setOrganizationFormError(
          "Organization name cannot exceed 100 characters."
        );
        return false;
      }

      if (description.length > 500) {
        setOrganizationFormError(
          "Description cannot exceed 500 characters."
        );
        return false;
      }

      return true;
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE / UPDATE ORGANIZATION
  |--------------------------------------------------------------------------
  */

  const handleOrganizationSubmit =
    async (event) => {
      event.preventDefault();

      if (!validateOrganization()) {
        return;
      }

      try {
        setOrganizationSaving(true);
        setOrganizationFormError("");

        const payload = {
          name:
            organizationForm.name.trim(),
          description:
            organizationForm.description.trim(),
        };

        if (editingOrganization) {
          await api.patch(
            `/organizations/${editingOrganization._id}`,
            payload
          );
        } else {
          await api.post(
            "/organizations",
            payload
          );
        }

        await fetchOrganizations();

        closeOrganizationModal();
      } catch (err) {
        console.error(
          "Organization save error:",
          err
        );

        setOrganizationFormError(
          err.response?.data?.message ||
            "Failed to save organization."
        );
      } finally {
        setOrganizationSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION STATUS
  |--------------------------------------------------------------------------
  */

  const handleOrganizationStatus =
    async (organization) => {
      if (!organization?._id) {
        return;
      }

      const isActive =
        organization.status ===
        "ACTIVE";

      const nextStatus = isActive
        ? "INACTIVE"
        : "ACTIVE";

      const action = isActive
        ? "deactivate"
        : "activate";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${action} "${organization.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setStatusLoading(
          organization._id
        );

        await api.patch(
          `/organizations/${organization._id}/status`,
          {
            status: nextStatus,
          }
        );

        await fetchOrganizations();
      } catch (err) {
        console.error(
          "Organization status error:",
          err
        );

        window.alert(
          err.response?.data?.message ||
            `Failed to ${action} organization.`
        );
      } finally {
        setStatusLoading(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | OPEN ADMIN MANAGEMENT
  |--------------------------------------------------------------------------
  */

  const openAdminManagement =
    async (organization) => {
      setSelectedOrganization(
        organization
      );

      setAdminForm(
        initialAdminForm
      );

      setAdminFormError("");

      setShowAdminModal(true);

      await fetchOrganizationAdmins(
        organization._id
      );
    };

  /*
  |--------------------------------------------------------------------------
  | FETCH ORGANIZATION ADMINS
  |--------------------------------------------------------------------------
  */

  const fetchOrganizationAdmins =
    async (organizationId) => {
      try {
        setAdminsLoading(true);
        setAdminFormError("");

        const response =
          await api.get(
            `/organizations/${organizationId}/admins`
          );

        setOrganizationAdmins(
          response.data?.admins ||
            []
        );
      } catch (err) {
        console.error(
          "Failed to fetch organization admins:",
          err
        );

        setAdminFormError(
          err.response?.data?.message ||
            "Failed to load organization admins."
        );
      } finally {
        setAdminsLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CLOSE ADMIN MODAL
  |--------------------------------------------------------------------------
  */

  const closeAdminModal =
    () => {
      if (adminSaving) {
        return;
      }

      setShowAdminModal(false);

      setSelectedOrganization(
        null
      );

      setOrganizationAdmins([]);

      setAdminForm(
        initialAdminForm
      );

      setAdminFormError("");
    };

  /*
  |--------------------------------------------------------------------------
  | ADMIN INPUT
  |--------------------------------------------------------------------------
  */

  const handleAdminChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setAdminForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      if (adminFormError) {
        setAdminFormError("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ADMIN VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateAdmin =
    () => {
      const name =
        adminForm.name.trim();

      const email =
        adminForm.email
          .trim()
          .toLowerCase();

      const password =
        adminForm.password;

      if (!name) {
        setAdminFormError(
          "Admin name is required."
        );
        return false;
      }

      if (name.length < 2) {
        setAdminFormError(
          "Admin name must contain at least 2 characters."
        );
        return false;
      }

      if (!email) {
        setAdminFormError(
          "Admin email is required."
        );
        return false;
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        setAdminFormError(
          "Please enter a valid email address."
        );
        return false;
      }

      if (!password) {
        setAdminFormError(
          "Password is required."
        );
        return false;
      }

      if (password.length < 6) {
        setAdminFormError(
          "Password must contain at least 6 characters."
        );
        return false;
      }

      return true;
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE ADMIN
  |--------------------------------------------------------------------------
  */

  const handleCreateAdmin =
    async (event) => {
      event.preventDefault();

      if (!selectedOrganization) {
        return;
      }

      if (!validateAdmin()) {
        return;
      }

      try {
        setAdminSaving(true);
        setAdminFormError("");

        await api.post(
          `/organizations/${selectedOrganization._id}/admin`,
          {
            name:
              adminForm.name.trim(),
            email:
              adminForm.email
                .trim()
                .toLowerCase(),
            password:
              adminForm.password,
          }
        );

        setAdminForm(
          initialAdminForm
        );

        await fetchOrganizationAdmins(
          selectedOrganization._id
        );

        window.alert(
          "Organization Admin created successfully."
        );
      } catch (err) {
        console.error(
          "Create organization admin error:",
          err
        );

        setAdminFormError(
          err.response?.data?.message ||
            "Failed to create organization admin."
        );
      } finally {
        setAdminSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ADMIN STATUS
  |--------------------------------------------------------------------------
  */

  const handleAdminStatus =
    async (admin) => {
      if (
        !selectedOrganization ||
        !admin?._id
      ) {
        return;
      }

      const isActive =
        admin.status === "ACTIVE";

      const nextStatus = isActive
        ? "INACTIVE"
        : "ACTIVE";

      const action = isActive
        ? "deactivate"
        : "activate";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${action} "${admin.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setAdminStatusLoading(
          admin._id
        );

        await api.patch(
          `/organizations/${selectedOrganization._id}/admin/${admin._id}/status`,
          {
            status: nextStatus,
          }
        );

        await fetchOrganizationAdmins(
          selectedOrganization._id
        );
      } catch (err) {
        console.error(
          "Admin status update error:",
          err
        );

        window.alert(
          err.response?.data?.message ||
            `Failed to ${action} admin.`
        );
      } finally {
        setAdminStatusLoading(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <Loading />;
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="page">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="page-head">
        <div>
          <h1>
            Organizations
          </h1>

          <p>
            Create and manage organizations
            registered in the feedback
            management system.
          </p>
        </div>

        <button
          type="button"
          className="ui-button ui-button-primary ui-button-medium"
          onClick={
            openCreateOrganization
          }
        >
          + Create Organization
        </button>
      </div>

      {/* =====================================================
          PAGE ERROR
      ====================================================== */}

      {pageError && (
        <div className="error-box">
          {pageError}
        </div>
      )}

      {/* =====================================================
          ORGANIZATION LIST
      ====================================================== */}

      {organizations.length ===
      0 ? (
        <div className="ui-card">
          <EmptyState
            title="No organizations found"
            message="Create an organization to start managing the feedback management system."
          />
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Organization
                  </th>

                  <th>
                    Description
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {organizations.map(
                  (organization) => {
                    const isActive =
                      organization.status ===
                      "ACTIVE";

                    const isUpdating =
                      statusLoading ===
                      organization._id;

                    return (
                      <tr
                        key={
                          organization._id
                        }
                      >
                        <td>
                          <strong>
                            {
                              organization.name
                            }
                          </strong>
                        </td>

                        <td>
                          <span className="table-subtext">
                            {organization.description ||
                              "No description"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              isActive
                                ? "badge-active"
                                : "badge-inactive"
                            }`}
                          >
                            <span className="status-dot">
                              ●
                            </span>

                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          {organization.createdAt
                            ? new Date(
                                organization.createdAt
                              ).toLocaleDateString(
                                undefined,
                                {
                                  day: "2-digit",
                                  month:
                                    "short",
                                  year:
                                    "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        <td>
                          <div className="table-actions">
                            <ViewDetailsButton item={organization} />

                            <button
                              type="button"
                              className="ui-button ui-button-secondary ui-button-small"
                              onClick={() =>
                                openAdminManagement(
                                  organization
                                )
                              }
                              disabled={
                                isUpdating
                              }
                            >
                              Admin
                            </button>

                            <button
                              type="button"
                              className="ui-button ui-button-secondary ui-button-small"
                              onClick={() =>
                                openEditOrganization(
                                  organization
                                )
                              }
                              disabled={
                                isUpdating
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className={`ui-button ui-button-small ${
                                isActive
                                  ? "ui-button-danger"
                                  : "ui-button-primary"
                              }`}
                              onClick={() =>
                                handleOrganizationStatus(
                                  organization
                                )
                              }
                              disabled={
                                isUpdating
                              }
                            >
                              {isUpdating
                                ? "Updating..."
                                : isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE / EDIT ORGANIZATION MODAL
      ====================================================== */}

      <Modal
        open={
          showOrganizationModal
        }
        title={
          editingOrganization
            ? "Edit Organization"
            : "Create Organization"
        }
        onClose={
          closeOrganizationModal
        }
        size="medium"
      >
        <form
          onSubmit={
            handleOrganizationSubmit
          }
          className="organization-form"
        >

          <div className="organization-form-intro">
            <p>
              {editingOrganization
                ? "Update the organization details below."
                : "Add a new organization to the feedback management system."}
            </p>
          </div>

          {organizationFormError && (
            <div className="error-box organization-form-error">
              {
                organizationFormError
              }
            </div>
          )}

          <Input
            label="Organization Name"
            name="name"
            value={
              organizationForm.name
            }
            onChange={
              handleOrganizationChange
            }
            placeholder="Enter organization name"
            required
            disabled={
              organizationSaving
            }
          />

          <div className="form-field">
            <label htmlFor="organization-description">
              Description
            </label>

            <textarea
              id="organization-description"
              name="description"
              value={
                organizationForm.description
              }
              onChange={
                handleOrganizationChange
              }
              placeholder="Enter a short description"
              rows={4}
              maxLength={500}
              disabled={
                organizationSaving
              }
            />

            <div className="field-helper">
              <span>
                Optional
              </span>

              <span>
                {
                  organizationForm
                    .description
                    .length
                }
                /500
              </span>
            </div>
          </div>

          {editingOrganization && (
            <div className="organization-current-status">
              <span>
                Current Status
              </span>

              <span
                className={`badge ${
                  editingOrganization.status ===
                  "ACTIVE"
                    ? "badge-active"
                    : "badge-inactive"
                }`}
              >
                ●{" "}
                {editingOrganization.status ===
                "ACTIVE"
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>
          )}

          <div className="organization-form-footer">

            <button
              type="button"
              className="ui-button ui-button-secondary ui-button-medium"
              onClick={
                closeOrganizationModal
              }
              disabled={
                organizationSaving
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ui-button ui-button-primary ui-button-medium"
              disabled={
                organizationSaving
              }
            >
              {organizationSaving
                ? editingOrganization
                  ? "Updating..."
                  : "Creating..."
                : editingOrganization
                ? "Update Organization"
                : "Create Organization"}
            </button>

          </div>
        </form>
      </Modal>

      {/* =====================================================
          ORGANIZATION ADMIN MODAL
      ====================================================== */}

      <Modal
        open={showAdminModal}
        title={
          selectedOrganization
            ? `${selectedOrganization.name} — Admin`
            : "Organization Admin"
        }
        onClose={
          closeAdminModal
        }
        size="large"
      >

        <div className="organization-admin-modal">

          {/* =================================================
              CREATE ADMIN
          ================================================== */}

          <div className="organization-admin-section">

            <div className="organization-admin-section-header">
              <div>
                <h3>
                  Create Organization Admin
                </h3>

                <p>
                  Create login credentials
                  for an administrator of
                  this organization.
                </p>
              </div>
            </div>

            {adminFormError && (
              <div className="error-box organization-form-error">
                {adminFormError}
              </div>
            )}

            <form
              onSubmit={
                handleCreateAdmin
              }
              className="admin-form"
            >

              <div className="admin-form-grid">

                <Input
                  label="Name"
                  name="name"
                  value={
                    adminForm.name
                  }
                  onChange={
                    handleAdminChange
                  }
                  placeholder="Enter admin name"
                  required
                  disabled={
                    adminSaving
                  }
                />

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={
                    adminForm.email
                  }
                  onChange={
                    handleAdminChange
                  }
                  placeholder="admin@example.com"
                  required
                  disabled={
                    adminSaving
                  }
                />

              </div>

              <Input
                label="Password"
                name="password"
                type="password"
                value={
                  adminForm.password
                }
                onChange={
                  handleAdminChange
                }
                placeholder="Minimum 6 characters"
                required
                disabled={
                  adminSaving
                }
              />

              <div className="admin-form-footer">
                <button
                  type="submit"
                  className="ui-button ui-button-primary ui-button-medium"
                  disabled={
                    adminSaving
                  }
                >
                  {adminSaving
                    ? "Creating..."
                    : "Create Admin"}
                </button>
              </div>

            </form>

          </div>

          {/* =================================================
              EXISTING ADMINS
          ================================================== */}

          <div className="organization-admin-section">

            <div className="organization-admin-section-header">
              <div>
                <h3>
                  Organization Admins
                </h3>

                <p>
                  Administrators currently
                  associated with this
                  organization.
                </p>
              </div>

              <span className="admin-count">
                {organizationAdmins.length}
              </span>
            </div>

            {adminsLoading ? (
              <div className="loading-state">
                Loading administrators...
              </div>
            ) : organizationAdmins.length ===
              0 ? (
              <div className="admin-empty-state">
                <strong>
                  No administrators
                </strong>

                <span>
                  Create an administrator
                  using the form above.
                </span>
              </div>
            ) : (
              <div className="admin-list">

                {organizationAdmins.map(
                  (admin) => {
                    const isActive =
                      admin.status ===
                      "ACTIVE";

                    const updating =
                      adminStatusLoading ===
                      admin._id;

                    return (
                      <div
                        className="admin-list-item"
                        key={
                          admin._id
                        }
                      >

                        <div className="admin-main-info">

                          <strong>
                            {admin.name}
                          </strong>

                          <span>
                            {admin.email}
                          </span>

                        </div>

                        <div className="admin-meta">

                          <span
                            className={`badge ${
                              isActive
                                ? "badge-active"
                                : "badge-inactive"
                            }`}
                          >
                            <span className="status-dot">
                              ●
                            </span>

                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>

                          <button
                            type="button"
                            className={`ui-button ui-button-small ${
                              isActive
                                ? "ui-button-danger"
                                : "ui-button-primary"
                            }`}
                            onClick={() =>
                              handleAdminStatus(
                                admin
                              )
                            }
                            disabled={
                              updating
                            }
                          >
                            {updating
                              ? "Updating..."
                              : isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </div>
      </Modal>
    </div>
  );
};

export default Organizations;
