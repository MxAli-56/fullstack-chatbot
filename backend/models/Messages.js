const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    sender: { type: String, enum: ["user", "bot"], required: true },
    name: { type: String, default: "" },
    senderid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: true
    },
  },
  { timestamps: true } // ✅ adds createdAt & updatedAt automatically
);

module.exports = mongoose.model("Messages", messageSchema);
