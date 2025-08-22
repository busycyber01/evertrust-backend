const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    try {
      const { name, email, password } = userData;
      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      
      console.log('📝 Creating user:', { name, email, id });
      
      const result = await query(
        `INSERT INTO users (id, name, email, password_hash, balance, is_admin, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, email, balance, created_at`,
        [id, name, email, passwordHash, 0.00, false, new Date()]
      );
      
      console.log('✅ User created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      console.log('🔍 Finding user by email:', email);
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length > 0) {
        console.log('✅ User found:', result.rows[0].email);
      } else {
        console.log('ℹ️  User not found with email:', email);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, name, email, balance, is_admin, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async updateBalance(userId, amount) {
    try {
      const result = await query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [amount, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const result = await query(
        'SELECT id, name, email, balance, is_admin, created_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COALESCE(SUM(balance), 0) as total_balance,
          COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_count
        FROM users
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = User;
