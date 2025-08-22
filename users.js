const express = require('express');
const authenticateToken = require('../middleware/auth');
const { 
  getBalance, 
  getTransactions, 
  requestFunds, 
  getFundRequests,
  getProfile
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticateToken);

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.post('/request-funds', requestFunds);
router.get('/fund-requests', getFundRequests);
router.get('/profile', getProfile);

module.exports = router;