const User = require('../models/User');
const Transaction = require('../models/Transaction');
const FundRequest = require('../models/FundRequest');

const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ balance: user.balance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await Transaction.findByUserId(req.user.id, limit);
    
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const requestFunds = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount required' });
    }

    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum request amount is $10,000' });
    }

    const newRequest = await FundRequest.create({
      userId: req.user.id,
      amount,
      reason: reason || 'Fund request'
    });

    res.status(201).json({
      message: 'Fund request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Request funds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFundRequests = async (req, res) => {
  try {
    const requests = await FundRequest.findByUserId(req.user.id);
    res.json(requests);
  } catch (error) {
    console.error('Get fund requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      joined: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBalance,
  getTransactions,
  requestFunds,
  getFundRequests,
  getProfile
};