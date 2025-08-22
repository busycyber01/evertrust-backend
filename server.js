const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Debug: Log current directory and check if routes exist
console.log('Current directory:', __dirname);
console.log('Routes directory exists:', fs.existsSync(path.join(__dirname, 'routes')));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://evertrust-bank.vercel.app/',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes with error handling
let authRoutes, userRoutes, adminRoutes, transactionRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✓ Auth routes loaded successfully');
} catch (error) {
  console.error('✗ Failed to load auth routes:', error.message);
  // Create fallback route if auth routes fail
  authRoutes = express.Router();
  authRoutes.post('/signup', (req, res) => {
    res.status(500).json({ message: 'Auth routes not configured properly' });
  });
  authRoutes.post('/login', (req, res) => {
    res.status(500).json({ message: 'Auth routes not configured properly' });
  });
}

try {
  userRoutes = require('./routes/users');
  console.log('✓ User routes loaded successfully');
} catch (error) {
  console.error('✗ Failed to load user routes:', error.message);
  userRoutes = express.Router();
  userRoutes.use((req, res) => {
    res.status(500).json({ message: 'User routes not configured properly' });
  });
}

try {
  adminRoutes = require('./routes/admin');
  console.log('✓ Admin routes loaded successfully');
} catch (error) {
  console.error('✗ Failed to load admin routes:', error.message);
  adminRoutes = express.Router();
  adminRoutes.use((req, res) => {
    res.status(500).json({ message: 'Admin routes not configured properly' });
  });
}

try {
  transactionRoutes = require('./routes/transactions');
  console.log('✓ Transaction routes loaded successfully');
} catch (error) {
  console.error('✗ Failed to load transaction routes:', error.message);
  transactionRoutes = express.Router();
  transactionRoutes.use((req, res) => {
    res.status(500).json({ message: 'Transaction routes not configured properly' });
  });
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', transactionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Evertrust Bank API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Evertrust Bank API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        signup: '/api/auth/signup',
        login: '/api/auth/login'
      },
      users: {
        balance: '/api/users/balance',
        transactions: '/api/users/transactions',
        requestFunds: '/api/users/request-funds'
      },
      admin: {
        dashboard: '/api/admin/dashboard/stats',
        fundRequests: '/api/admin/fund-requests'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully');
  process.exit(0);
});

module.exports = app;
