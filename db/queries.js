require("dotenv").config();
const { Pool } = require("pg");

// Find a way to make it work both local and railway

module.exports = new Pool({
  connectionString: process.env.DATABASE_URL,
});
