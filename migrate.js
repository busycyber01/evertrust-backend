const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function migrate() {
  const client = await query.getClient();
  
  try {
    console.log('Running Supabase migrations...');
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'funding')),
        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        description TEXT,
        recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create fund_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_requests (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fund_requests_user_id ON fund_requests(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fund_requests_status ON fund_requests(status)');

    // Check if admin user exists
    const adminCheck = await client.query(
      'SELECT * FROM users WHERE email = $1', 
      ['admin@evertrust.com']
    );
    
    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, is_admin, balance) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['Admin User', 'admin@evertrust.com', passwordHash, true, 10000.00]
      );
      console.log('Admin user created: admin@evertrust.com / admin123');
    }

    await client.query('COMMIT');
    console.log('Supabase migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();