const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { name, email, password } = userData;
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await query(
      'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, balance, created_at',
      [id, name, email, passwordHash]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, balance, is_admin, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async updateBalance(userId, amount) {
    const result = await query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
      [amount, userId]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await query(
      'SELECT id, name, email, balance, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(balance), 0) as total_balance,
        COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_count
      FROM users
    `);
    return result.rows[0];
  }
}

module.exports = User;