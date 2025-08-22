const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Transaction {
  static async create(transactionData) {
    const { userId, type, amount, status, description, recipientId } = transactionData;
    const id = uuidv4();
    
    const result = await query(
      `INSERT INTO transactions (id, user_id, type, amount, status, description, recipient_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, userId, type, amount, status, description, recipientId]
    );
    return result.rows[0];
  }

  static async findByUserId(userId, limit = 10) {
    const result = await query(
      `SELECT t.*, u.name as recipient_name 
       FROM transactions t 
       LEFT JOIN users u ON t.recipient_id = u.id 
       WHERE t.user_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async getAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT t.*, u.name as user_name, u.email as user_email,
       r.name as recipient_name, r.email as recipient_email
       FROM transactions t 
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users r ON t.recipient_id = r.id 
       ORDER BY t.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN type = 'deposit' THEN 1 END) as deposit_count,
        COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) as withdrawal_count,
        COUNT(CASE WHEN type = 'transfer' THEN 1 END) as transfer_count
      FROM transactions
      WHERE status = 'completed'
    `);
    return result.rows[0];
  }
}

module.exports = Transaction;