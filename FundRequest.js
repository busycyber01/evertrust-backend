const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class FundRequest {
  static async create(requestData) {
    const { userId, amount, reason } = requestData;
    const id = uuidv4();
    
    const result = await query(
      'INSERT INTO fund_requests (id, user_id, amount, reason) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, amount, reason]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM fund_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findAll(status = null, limit = 50, offset = 0) {
    let queryText = `
      SELECT fr.*, u.name as user_name, u.email 
      FROM fund_requests fr 
      JOIN users u ON fr.user_id = u.id 
    `;
    
    let queryParams = [limit, offset];
    
    if (status) {
      queryText += ' WHERE fr.status = $3 ';
      queryParams.push(status);
    }
    
    queryText += ' ORDER BY fr.created_at DESC LIMIT $1 OFFSET $2';
    
    const result = await query(queryText, queryParams);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM fund_requests WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const result = await query(
      'UPDATE fund_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM fund_requests
    `);
    return result.rows[0];
  }
}

module.exports = FundRequest;