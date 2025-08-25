// api/index.js
require("dotenv").config();
const app = require("../backend/app");

// Add console log to confirm it's loading
console.log("API server starting...");

module.exports = app;
