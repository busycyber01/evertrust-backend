const User = require('../models/User');
const FundRequest = require('../models/FundRequest');
const Transaction = require('../models/Transaction');
const { query, getClient } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const [userStats, transactionStats, fundRequestStats] = await Promise.all([
      User.getStats(),
      Transaction.getStats(),
      FundRequest.getStats()
    ]);

    res.json({
      users: userStats,
      transactions: transactionStats,
      fundRequests: fundRequestStats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFundRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const requests = await FundRequest.findAll(status, limit, offset);
    res.json(requests);
  } catch (error) {
    console.error('Get fund requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const approveFundRequest = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const requestResult = await client.query(
      'SELECT * FROM fund_requests WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Request already processed' });
    }

    await client.query(
      'UPDATE fund_requests SET status = $1 WHERE id = $2',
      ['approved', id]
    );

    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [request.amount, request.user_id]
    );

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'funding', $2, 'completed', $3)`,
      [request.user_id, request.amount, request.reason || 'Funds approved by admin']
    );

    await client.query('COMMIT');

    res.json({ message: 'Fund request approved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

const rejectFundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await FundRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    await FundRequest.updateStatus(id, 'rejected');

    res.json({ message: 'Fund request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addFunds = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount required' });
    }

    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount, id]
    );

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'funding', $2, 'completed', $3)`,
      [id, amount, description || 'Funds added by admin']
    );

    await client.query('COMMIT');

    res.json({ message: 'Funds added successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add funds error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const transactions = await Transaction.getAll(limit, offset);
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT t.*, u.name as user_name, u.email as user_email,
       r.name as recipient_name, r.email as recipient_email
       FROM transactions t 
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users r ON t.recipient_id = r.id 
       WHERE t.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getFundRequests,
  approveFundRequest,
  rejectFundRequest,
  getUsers,
  getUser,
  addFunds,
  getTransactions,
  getTransaction
};