const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

const razorpay = new Razorpay({ key_id, key_secret });

// Simple mapping of planId -> amount (in paise). Adjust amounts as needed.
const planAmountMap = {
  free: 0,
  pro: 1900 * 100, // ₹1,900.00 (paise)
  enterprise: 9900 * 100 // ₹9,900.00 (paise)
};

// Diagnostic route (GET /api/payments) to verify mounting
router.get('/', (req, res) => {
  return res.json({ success: true, message: 'Payments routes are mounted and working' });
});

// Simple request logger for payments router (POST/GET)
router.use((req, res, next) => {
  console.log(`[Payments Router] ${req.method} ${req.path}`);
  next();
});

// Create an order for a selected plan
router.post('/create-order', async (req, res) => {
  try {
    const { planId } = req.body || {};
    const amount = planAmountMap[planId] ?? planAmountMap.pro;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid or free plan selected' });
    }

    const options = {
      amount, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    return res.json({ success: true, order, key_id });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    return res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
});

// Complete subscription after successful payment
router.post('/complete-subscription', authenticateToken, async (req, res) => {
  try {
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For demo purposes, we'll skip Razorpay signature verification
    // In production, you should verify the signature before updating user subscription
    
    // Map planId to subscription details
    let subscriptionType = 'free';
    let isProUser = false;
    
    switch (planId) {
      case 'pro':
        subscriptionType = 'pro';
        isProUser = true;
        break;
      case 'enterprise':
        subscriptionType = 'enterprise';
        isProUser = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid plan selected'
        });
    }

    // Update user subscription
    user.subscriptionType = subscriptionType;
    user.isProUser = isProUser;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${subscriptionType} plan!`,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          subscriptionType: user.subscriptionType,
          isProUser: user.isProUser,
          subscriptionStatus: user.subscriptionStatus
        }
      }
    });

  } catch (error) {
    console.error('Complete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
