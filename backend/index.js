const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const PORT = 5000;

// ✅ CORS configuration with both frontend URLs
const allowedOrigins = [
  'http://localhost:3000',
  'https://upigpay.onrender.com',
  'https://upigpay-1.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const transactions = new Map();

// Test merchant details
const GOOGLE_MERCHANT_ID = '01234567890123456789';

app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and Order ID are required'
      });
    }

    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const transaction = {
      id: transactionId,
      orderId: orderId,
      amount: amount,
      currency: 'INR',
      merchantId: GOOGLE_MERCHANT_ID,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    transactions.set(transactionId, transaction);

    console.log('💰 Payment Initiated:', transactionId);
    console.log('   Amount:', amount);
    console.log('   Order ID:', orderId);

    res.json({
      success: true,
      transactionId: transactionId,
      merchantId: GOOGLE_MERCHANT_ID,
      amount: amount,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment'
    });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { transactionId, paymentData } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const transaction = transactions.get(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Simulate successful payment in sandbox
    transaction.status = 'COMPLETED';
    transaction.paymentData = paymentData || {};
    transaction.completedAt = new Date().toISOString();
    transaction.referenceId = `GP_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    transactions.set(transactionId, transaction);

    console.log('✅ Payment Verified:', transactionId);
    console.log('   Amount:', transaction.amount);
    console.log('   Status:', transaction.status);

    const receipt = {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      referenceId: transaction.referenceId,
      date: transaction.completedAt,
      paymentMethod: 'Google Pay (Test Card)'
    };

    console.log('📋 Receipt:', JSON.stringify(receipt, null, 2));

    res.json({
      success: true,
      message: 'Payment verified successfully',
      receipt: receipt
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

app.get('/api/transaction/:id', (req, res) => {
  const transaction = transactions.get(req.params.id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.json({
    success: true,
    transaction: transaction
  });
});

app.get('/api/transactions', (req, res) => {
  const allTransactions = Array.from(transactions.values());
  res.json({
    success: true,
    count: allTransactions.length,
    transactions: allTransactions
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📋 Allowed Origins:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log(`📋 Endpoints:`);
  console.log(`   POST /api/create-payment - Create payment`);
  console.log(`   POST /api/verify-payment - Verify payment`);
  console.log(`   GET  /api/transaction/:id - Get transaction`);
  console.log(`   GET  /api/transactions - Get all transactions`);
});
