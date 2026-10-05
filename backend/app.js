const express = require("express");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");

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


module.exports = app;