const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Model = require('../models/Model');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({ key_id, key_secret });

// --- CONFIGURATION: Subscription Plans ---
const planAmountMap = {
  free: 0,
  monthly: 49 * 100,      // ₹49
  six_months: 149 * 100,  // ₹149
  annual: 249 * 100,      // ₹249
  pro: 49 * 100,          // Legacy support
  enterprise: 249 * 100   // Legacy support
};

// ==========================================
// 1. SUBSCRIPTION FLOW (Pricing Page)
// ==========================================

// Create Order for Subscription
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const amount = planAmountMap[planId] ?? planAmountMap.pro;

    if (!amount) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const options = {
      amount,
      currency: 'INR',
      receipt: `sub_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order, key_id });

  } catch (err) {
    console.error('Subscription Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create subscription order' });
  }
});

// Complete/Verify Subscription
router.post('/complete-subscription', authenticateToken, async (req, res) => {
  try {
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user._id; // Ensure this matches your auth middleware (req.user.id or req.user._id)

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid Payment Signature' });
    }

    // 2. Update User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let end = new Date();
    if (planId === 'monthly') end.setMonth(end.getMonth() + 1);
    else if (planId === 'six_months') end.setMonth(end.getMonth() + 6);
    else if (planId === 'annual') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1); // Default

    user.subscriptionType = 'pro';
    user.isProUser = true;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();
    user.subscriptionEndDate = end;
    user.subscriptionPlanId = planId;

    await user.save();

    res.json({ success: true, message: 'Subscription active!', data: { user } });

  } catch (error) {
    console.error('Subscription Verification Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// ==========================================
// 2. PROMOTION FLOW (Get Featured Page)
// ==========================================

// Create Order for Featured Tool Promotion
router.post('/create-promotion-order', authenticateToken, async (req, res) => {
  try {
    const amount = 2999 * 100; // ₹2999
    const options = {
      amount,
      currency: 'INR',
      receipt: `promo_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order, key_id });

  } catch (err) {
    console.error('Promo Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create promotion order' });
  }
});

// Verify Promotion Payment
router.post('/verify-promotion', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, modelId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid Payment Signature' });
    }

    const model = await Model.findOne({ _id: modelId, uploadedBy: req.user._id });
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    model.featured = true;
    model.trendingScore = (model.trendingScore || 0) + 100;
    model.categoryTrendingScore = (model.categoryTrendingScore || 0) + 100;
    
    await model.save();

    res.json({ success: true, message: 'Tool Featured Successfully!', data: { model } });

  } catch (error) {
    console.error('Promo Verification Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
