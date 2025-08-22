const { Pool } = require('pg');

// Supabase connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.on('connect', (client) => {
  console.log('Connected to Supabase PostgreSQL');
});

pool.on('error', (err, client) => {
  console.error('Database error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};