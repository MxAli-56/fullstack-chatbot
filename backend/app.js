// backend/app.js
const express = require("express");
const path = require("path");
const app = express();

// Middleware
app.use(express.json());

// Serve static files from frontend directory (correct path)
app.use(express.static(path.join(__dirname, "../frontend")));

// Import and use your routes
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes = require("./routes/aiRoutes");

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat", aiRoutes);

// Serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/signup.html"));
});

// Catch-all for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

module.exports = app;
