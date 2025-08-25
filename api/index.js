// api/index.js
const serverless = require("serverless-http");
require("dotenv").config();
const app = require("../backend/app"); // ← point to your app.js

module.exports = serverless(app);
