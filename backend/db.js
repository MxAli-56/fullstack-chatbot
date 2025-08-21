//db.js
const Mongoose = require("mongoose")

const connectDB = async () => {
    try {
        await Mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log("MongoDB Connected");
    } catch (error) {
        console.log("MongoDB system error: ", error.message);
        process.exit(1)
    }
}

module.exports =  connectDB;