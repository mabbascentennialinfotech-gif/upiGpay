const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Express app
const app = express(); // <-- This is what you were missing!
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay with your test keys
const razorpay = new Razorpay({
  key_id: 'rzp_test_T4lGicSBURlT2o', // Replace with your test key ID
  key_secret: 'tn7lwLDUGYcb1T8KTCoHgQPT', // Replace with your test key secret
});

// In-memory storage for transactions
const transactions = new Map();

/**
 * POST /api/create-order
 * Creates a Razorpay order for GPay Omnichannel flow
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount = 1000, currency = 'INR' } = req.body; // amount in paise (₹10 = 1000 paise)

    const options = {
      amount: amount,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: 'rzp_test_T4lGicSBURlT2o', // Send to frontend
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

/**
 * POST /api/verify-payment
 * Verifies the payment signature from Razorpay
 */
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Create a signature using your key_secret
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', 'rzp_test_T4lGicSBURlT2o')
      .update(body)
      .digest('hex');

    // Compare the signatures
    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      // Store transaction
      const transaction = {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      };
      transactions.set(razorpay_order_id, transaction);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        transaction: transaction,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/transaction/:id
 * Get transaction details by order ID
 */
app.get('/api/transaction/:id', (req, res) => {
  const { id } = req.params;
  const transaction = transactions.get(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found',
    });
  }

  res.json({
    success: true,
    transaction: transaction,
  });
});

/**
 * GET /api/transactions
 * Get all transactions (for testing purposes)
 */
app.get('/api/transactions', (req, res) => {
  const allTransactions = Array.from(transactions.values());
  res.json({
    success: true,
    count: allTransactions.length,
    transactions: allTransactions,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/create-order - Create Razorpay order`);
  console.log(`   POST http://localhost:${PORT}/api/verify-payment - Verify payment`);
  console.log(`   GET  http://localhost:${PORT}/api/transaction/:id - Get transaction`);
  console.log(`   GET  http://localhost:${PORT}/api/transactions - Get all transactions`);
});

// Export for testing
module.exports = app;