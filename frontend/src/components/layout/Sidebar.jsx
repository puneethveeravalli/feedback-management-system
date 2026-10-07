import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const adminMenu = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Organizations", path: "/organizations", superOnly: true },
    { label: "Departments", path: "/departments" },
    { label: "Groups", path: "/groups" },
    { label: "Participants", path: "/participants" },
    { label: "Managers", path: "/managers" },
    { label: "Feedback Forms", path: "/feedback-forms" },
    { label: "Assignments", path: "/assignments" },
    { label: "Access Credentials", path: "/access-credentials" },
    { label: "Analytics", path: "/analytics" },
    { label: "Reports", path: "/reports" },
    { label: "Actions", path: "/actions" },
  ];

  const managerMenu = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Reports", path: "/reports" },
    { label: "Actions", path: "/actions" },
  ];

  let menu = [];
  if (user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN") {
    menu = adminMenu.filter((item) => !item.superOnly || user.role === "SUPER_ADMIN");
  } else if (user?.role === "MANAGER") {
    menu = managerMenu;
  }

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">F</div>
        <div className="sidebar-brand-text">
          <h2>Feedback</h2>
          <span>Management System</span>
        </div>
        <button
          type="button"
          className="sidebar-close-button"
          onClick={onClose}
          aria-label="Close navigation"
        >
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
