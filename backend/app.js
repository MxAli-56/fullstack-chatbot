const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./db");

// routes
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// connect to DB
connectDB();

// middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat", aiRoutes);

// Serve frontend static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "frontend")));

// Serve login page at /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

// Serve chat page at /chat after login
app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy" });
});

// Catch-all for other non-API routes (optional, for safety)
app.get(/^\/(?!api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

module.exports = app;
