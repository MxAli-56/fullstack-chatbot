//messageRoutes.js

const express = require ("express")
const authMiddleware = require ("../middleware/authMiddleware")
const Messages = require ("../models/Messages")
const rateLimit = require ("express-rate-limit")
const Filter = require("bad-words");

const router = express.Router()
const filter = new Filter();

const messageLimiter = rateLimit({
  windowMs: 1000, 
  max: 1, 
  keyGenerator: (req, res) => req.user.id,
  message: { error: "You're sending messages too fast, slow down." },
});

router.post("/", authMiddleware, messageLimiter,  async (req, res) => {
  try {
    const { text, sender, name } = req.body; // sender will be "user" or "bot"

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (filter.isProfane(text)) {
      return res.status(400).json({ message: "Message contains inappropriate words." });
    }

    const newMessage = new Messages({
      text: text,
      sender: sender || "user", 
      name: name || "",
      senderid: req.user.id
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


router.get("/", authMiddleware, async(req,res) => {
    try {
        const userId = req.user.id;

        // Parse query params
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 100); // cap at 100
        const before = req.query.before ? new Date(req.query.before) : null;

        // Build query: only this user's messages
        const query = { senderid: userId };

        // If "before" given, only messages older than that timestamp
        if (before && !isNaN(before.getTime())) {
          query.timestamp = { $lt: before };
        }

        // Get newest first, limited
        const docs = await Messages.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();

        // Reverse to oldest->newest for natural rendering
        const result = docs.reverse();

        res.json(result);
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
})

module.exports = router