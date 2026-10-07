const express = require("express");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const groupRoutes = require("./routes/groupRoutes");
const participantRoutes = require("./routes/participantRoutes");
const feedbackFormRoutes = require("./routes/feedbackFormRoutes");
const questionRoutes = require("./routes/questionRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const accessCredentialRoutes = require("./routes/accessCredentialRoutes");
const responseRoutes = require("./routes/responseRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const actionRoutes = require("./routes/actionRoutes");
const reportsRoutes = require("./routes/reportRoutes");

const app = express();
const cors = require("cors");
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));
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
app.use("/api/participants", participantRoutes);
app.use("/api/feedback-forms", feedbackFormRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/access-credentials", accessCredentialRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/actions", actionRoutes);
app.use("/api/reports", reportsRoutes);

module.exports = app;