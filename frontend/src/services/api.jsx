import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const activeOrganizationId = localStorage.getItem("activeOrganizationId");

  const publicRoutes = [
    "/auth/login",
    "/access-credentials/validate",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    config.url?.includes(route)
  );

  if (token && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (activeOrganizationId && token && !isPublicRoute) {
    config.headers["X-Organization-Id"] = activeOrganizationId;
  }

  return config;
});

export default api;
