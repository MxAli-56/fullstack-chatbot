//messageRoute.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Messages = require("../models/Messages");
const rateLimit = require("express-rate-limit");
const leoProfanity = require("leo-profanity");

const router = express.Router();

const messageLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1,
  keyGenerator: (req) => req.user.id,
  message: { error: "You're sending messages too fast, slow down." },
});

// POST message (user or bot)
router.post("/", authMiddleware, messageLimiter, async (req, res) => {
  try {
    const { text, sender, name } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // 🚫 Block inappropriate words

    if (leoProfanity.check(text)) {
      return res
        .status(400)
        .json({ message: "Message contains inappropriate words." });
    }

    // Validate sender (only user or bot allowed)
    const validSenders = ["user", "bot"];
    const senderValue = validSenders.includes(sender) ? sender : "user";

    // ✅ Save only clean messages
    const newMessage = new Messages({
      text,
      sender: senderValue,
      name: name || "",
      senderid: req.user.id,
    });

    const savedMessage = await newMessage.save();

    res.status(200).json({
      message: "Message saved",
      messageData: savedMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET messages
// GET messages
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const query = { senderid: userId };
    if (before && !isNaN(before.getTime())) {
      query.createdAt = { $lt: before };
    }

    const docs = await Messages.find(query)
      .sort({ createdAt: -1 }) // Get newest first
      .limit(limit)
      .lean();

    // Add timestamp field for frontend compatibility
    const messagesWithTimestamp = docs.map((msg) => ({
      ...msg,
      timestamp: msg.createdAt,
    }));

    // REMOVE .reverse() here - let frontend handle ordering
    res.json(messagesWithTimestamp);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
