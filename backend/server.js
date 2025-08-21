//server.js

const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./db")
const userRoutes =  require("./routes/userRoutes")
const messageRoutes = require("./routes/messageRoutes")

dotenv.config();

connectDB()

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api/users", userRoutes)
app.use("/api/messages", messageRoutes)

app.get("/", (req,res) => {
    res.send("Api is working!")
})

app.get("/health", (req,res) => {
    res.json({status: "ok", message: "Server is healthy"})
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})