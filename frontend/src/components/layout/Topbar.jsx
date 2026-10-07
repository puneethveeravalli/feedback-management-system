import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const Topbar = ({ onMenuClick }) => {
  const { user, logout, setActiveOrganization } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState(
    localStorage.getItem("activeOrganizationId") || ""
  );

  const getRoleLabel = (role) => {
    const labels = {
      SUPER_ADMIN: "Super Admin",
      ORG_ADMIN: "Organization Admin",
      MANAGER: "Manager",
      PARTICIPANT: "Participant",
    };
    return labels[role] || role || "";
  };

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;

    const loadOrganizations = async () => {
      try {
        const response = await api.get("/organizations");
        const list = (response.data?.organizations || []).filter(
          (organization) => organization.status === "ACTIVE"
        );
        setOrganizations(list);

        const current = list.find((item) => item._id === activeOrganizationId) || list[0];
        if (current && current._id !== activeOrganizationId) {
          setActiveOrganizationId(current._id);
          setActiveOrganization(current);
        }
      } catch {
        setOrganizations([]);
      }
    };

    loadOrganizations();
  }, [user?.role]);

  const handleOrganizationChange = (event) => {
    const organization = organizations.find(
      (item) => item._id === event.target.value
    );
    if (!organization) return;

    setActiveOrganizationId(organization._id);
    setActiveOrganization(organization);
    window.location.reload();
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu-button"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="topbar-title">
        <h1>Feedback Management</h1>
        {user?.role === "SUPER_ADMIN" && (
          <span className="topbar-scope-label">
            {localStorage.getItem("activeOrganizationName") || "Select organization"}
          </span>
        )}
      </div>

      {user?.role === "SUPER_ADMIN" && organizations.length > 0 && (
        <div className="topbar-organization-selector">
          <label htmlFor="active-organization">Organization</label>
          <select
            id="active-organization"
            value={activeOrganizationId}
            onChange={handleOrganizationChange}
          >
            {organizations.map((organization) => (
              <option key={organization._id} value={organization._id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="topbar-right">
        <div className="user-info">
          <strong>{user?.name || user?.email || "User"}</strong>
          <span>{getRoleLabel(user?.role)}</span>
        </div>

        <button type="button" className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
