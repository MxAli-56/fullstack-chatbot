// api/index.js
const serverless = require("serverless-http");
const app = require("../backend/app"); // ← point to server.js now
module.exports = serverless(app);