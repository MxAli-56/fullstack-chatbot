//db.js
// db.js
const mongoose = require("mongoose");

let isConnected = false; // connection state

const connectDB = async () => {
  if (isConnected) {
    // Already connected
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB system error: ", error.message);
    throw error;
  }
};

module.exports = connectDB;