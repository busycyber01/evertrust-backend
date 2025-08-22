const { Pool } = require('pg');

// Supabase connection pool with enhanced logging
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Enhanced connection logging
pool.on('connect', (client) => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err, client) => {
  console.error('❌ Database error:', err);
});

// Enhanced query function with logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    console.log('📊 Executing query:', text.substring(0, 100) + '...');
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Query executed in ${duration}ms, rows: ${res.rowCount}`);
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query failed after ${duration}ms:`, error);
    throw error;
  }
};

// Test connection function
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

module.exports = {
  query,
  getClient: () => pool.connect(),
  testConnection,
  pool
};
