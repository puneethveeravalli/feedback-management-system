import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

const loadSuperAdminOrganization = async () => {
  try {
    const response = await api.get("/organizations");
    const organizations = response.data?.organizations || [];
    const active = organizations.filter((item) => item.status === "ACTIVE");
    const currentId = localStorage.getItem("activeOrganizationId");
    const selected = active.find((item) => item._id === currentId) || active[0];

    if (selected) {
      localStorage.setItem("activeOrganizationId", selected._id);
      localStorage.setItem("activeOrganizationName", selected.name);
    } else {
      localStorage.removeItem("activeOrganizationId");
      localStorage.removeItem("activeOrganizationName");
    }

    return active;
  } catch {
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me")
      .then(async (res) => {
        const loggedInUser = res.data.user;
        setUser(loggedInUser);
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        if (loggedInUser.role === "SUPER_ADMIN") {
          await loadSuperAdminOrganization();
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeOrganizationId");
        localStorage.removeItem("activeOrganizationName");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const loggedInUser = res.data.user;

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(loggedInUser));

    if (loggedInUser.role === "SUPER_ADMIN") {
      await loadSuperAdminOrganization();
    } else {
      localStorage.removeItem("activeOrganizationId");
      localStorage.removeItem("activeOrganizationName");
    }

    setUser(loggedInUser);
    return res.data;
  };

  const setActiveOrganization = (organization) => {
    if (!organization?._id) return;
    localStorage.setItem("activeOrganizationId", organization._id);
    localStorage.setItem("activeOrganizationName", organization.name || "");
    window.dispatchEvent(new Event("active-organization-changed"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeOrganizationId");
    localStorage.removeItem("activeOrganizationName");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, setActiveOrganization }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
