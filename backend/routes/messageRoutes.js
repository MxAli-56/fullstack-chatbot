//messageRoutes.js

const express = require ("express")
const authMiddleware = require ("../middleware/authMiddleware")
const Messages = require ("../models/Messages")

const router = express.Router()

router.post("/", authMiddleware, async(req,res) => {

try {
    const {text} = req.body

    if (!text || !text.trim()){
        return res.status(400).json({message: "Message cannot be empty"})
    }

    const newMessage = new Messages({
        senderid: req.user.id,
        text: text
})

    const savedMessages = await newMessage.save();
    
    res.status(200).json({message: "Message saved", messageData: savedMessages})
} catch (error) {
    return res.status(500).json({error: error.message})
}
})

router.get("/", authMiddleware, async(req,res) => {
    try {
        const getMessage = await Messages.find({senderid: req.user.id}).sort({timestamp: 1})
        return res.json(getMessage)
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
})

module.exports = router