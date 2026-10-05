const express = require("express");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const groupRoutes = require("./routes/groupRoutes");
const participantRoutes = require("./routes/participantRoutes");
const targetRoutes = require("./routes/targetRoutes");
const feedbackFormRoutes = require("./routes/feedbackFormRoutes");
const questionRoutes = require("./routes/questionRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const accessCredentialRoutes = require("./routes/accessCredentialRoutes");

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
app.use("/api/participants", participantRoutes);
app.use("/api/targets", targetRoutes);
app.use("/api/feedback-forms", feedbackFormRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/access-credentials", accessCredentialRoutes);


module.exports = app;