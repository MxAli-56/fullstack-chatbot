// server.js
require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  // Only listen when running locally
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app; // <- export for serverless use