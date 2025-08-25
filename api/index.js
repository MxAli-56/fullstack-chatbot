// api/index.js
require("dotenv").config();
const app = require("../backend/app");

module.exports = app; // ← Just export the app directly, no serverless-http needed
