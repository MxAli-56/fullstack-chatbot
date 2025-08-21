const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, enum: ["user", "bot"], required: true }, // NEW
  senderid: {type: mongoose.Schema.Types.ObjectId, ref: "User", default: null}, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Messages", messageSchema);
