// app.js
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

// Serve frontend static files
app.use(express.static(path.join(__dirname, "frontend")));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy" });
});

// ✅ Catch-all route for non-API requests (Vercel-safe)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

module.exports = app;
