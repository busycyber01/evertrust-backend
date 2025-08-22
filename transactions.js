const express = require('express');
const authenticateToken = require('../middleware/auth');
const { transfer, withdraw } = require('../controllers/transactionController');

const router = express.Router();

router.use(authenticateToken);

router.post('/transfer', transfer);
router.post('/withdraw', withdraw);

module.exports = router;