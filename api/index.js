// api/index.js
const serverless = require("serverless-http");
require("dotenv").config();
const app = require("../app");

module.exports = (req, res) => serverless(app)(req, res);