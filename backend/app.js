const express = require("express");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const groupRoutes = require("./routes/groupRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Feedback Management System API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/groups", groupRoutes);


module.exports = app;