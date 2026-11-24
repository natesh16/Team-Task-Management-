const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const taskRoutes = require("./routes/taskRoutes");
const User = require("./models/User");
const { seedDemo } = require("./seeders/seedDemo");

const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// Serve the built frontend in production when available
const clientDist = path.resolve(__dirname, "../client/dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// 404 handler
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Central error handler - always respond with JSON
app.use((err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Server error";

  // Turn model-level validation and bad ObjectId errors into clean 400 responses.
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((item) => item.message)
      .join(", ");
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 400;
    message = "A record with that value already exists";
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(`[${statusCode}] ${message}`);
  }
  res.status(statusCode).json({
    success: false,
    message,
  });
});

const start = async () => {
  await connectDB();

  // First run convenience: create demo users/teams/tasks when the DB is empty.
  try {
    const userCount = await User.estimatedDocumentCount();
    if (userCount === 0) {
      console.log("Empty database detected - seeding demo data...");
      await seedDemo({ log: (message) => console.log(`  ${message}`) });
      console.log("Demo data ready. Login with admin@taskmask.com / TaskMaskAdmin2026!");
    }
  } catch (error) {
    console.error(`Demo seed skipped: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

module.exports = app;
