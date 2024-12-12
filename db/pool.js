require("dotenv").config();
const { Pool } = require("pg");

module.exports = new Pool({
  connectionString:
    "postgresql://postgres:NEftnyyjALptQJZyxElGOPuzlIUckcdN@postgres.railway.internal:5432/railway",
  ssl: {
    rejectUnauthorized: false,
  },
});
