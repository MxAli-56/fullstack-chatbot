//messageRoutes.js

const express = require ("express")
const authMiddleware = require ("../middleware/authMiddleware")
const Messages = require ("../models/Messages")

const router = express.Router()

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { text, sender } = req.body; // sender will be "user" or "bot"

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = new Messages({
      text,
      sender: sender || "user", // default to "user"
      senderid: sender === "user" ? req.user.id : null, // only save user id if it's from user
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
        const getMessage = await Messages.find({senderid: req.user.id}).sort({timestamp: 1})
        return res.json(getMessage)
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
})

module.exports = router