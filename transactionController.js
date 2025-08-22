const { getClient } = require('../config/database');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const transfer = async (req, res) => {
  const client = await getClient();
  
  try {
    const { recipientEmail, amount, description } = req.body;

    if (!recipientEmail || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid recipient and amount required' });
    }

    if (recipientEmail === req.user.email) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    
    if (userResult.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const recipientResult = await client.query(
      'SELECT id, name FROM users WHERE email = $1',
      [recipientEmail]
    );
    
    if (recipientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Recipient not found' });
    }

    const recipient = recipientResult.rows[0];

    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [amount, req.user.id]
    );

    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount, recipient.id]
    );

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description, recipient_id) 
       VALUES ($1, 'transfer', $2, 'completed', $3, $4)`,
      [req.user.id, amount, description, recipient.id]
    );

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description, recipient_id) 
       VALUES ($1, 'deposit', $2, 'completed', $3, $4)`,
      [recipient.id, amount, description, req.user.id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Transfer successful' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error during transfer' });
  } finally {
    client.release();
  }
};

const withdraw = async (req, res) => {
  const client = await getClient();
  
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount required' });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    
    if (userResult.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [amount, req.user.id]
    );

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description) 
       VALUES ($1, 'withdrawal', $2, 'completed', $3)`,
      [req.user.id, amount, description || 'Withdrawal']
    );

    await client.query('COMMIT');

    res.json({ message: 'Withdrawal successful' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error during withdrawal' });
  } finally {
    client.release();
  }
};

module.exports = {
  transfer,
  withdraw
};