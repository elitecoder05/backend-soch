const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Model = require('../models/Model');
const Order = require('../models/Order'); 
const PricingPlan = require('../models/PricingPlan');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({ key_id, key_secret });

// Currency conversion rate USD to INR (should be updated regularly or fetched from API)
const USD_TO_INR_RATE = 84; // Approximate rate, update as needed

// Helper function to detect if user is from India
const isUserFromIndia = (req) => {
  // Check user's country from IP, user profile, or request headers
  // For now, we'll check if user has INR preference or IP-based detection
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const countryHint = req.headers['cf-ipcountry'] || req.headers['x-country']; // Cloudflare or other proxy headers
  
  // You can also check user's saved preference in the database
  return countryHint === 'IN' || acceptLanguage.includes('hi-IN') || acceptLanguage.includes('en-IN');
};

// Helper function to convert USD to INR cents for Razorpay
const convertToPaymentCurrency = (usdAmount, isIndia) => {
  if (isIndia) {
    // Convert USD to INR and multiply by 100 for paise (smallest INR unit)
    return Math.round(usdAmount * USD_TO_INR_RATE * 100);
  } else {
    // Keep in USD cents
    return Math.round(usdAmount * 100);
  }
};

// ==========================================
// 1. CREATE ORDER FOR ANY PLAN
// ==========================================
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { planId, category } = req.body; // category can be 'store' or 'script-generator'
    
    console.log('🔍 [CREATE-ORDER] Request received:', { planId, category, userId: req.user._id });
    
    // Get plan details from database
    const plan = await PricingPlan.findOne({ planId, category, isActive: true });
    console.log('🔍 [CREATE-ORDER] Plan lookup result:', plan);
    
    if (!plan) {
      console.log('❌ [CREATE-ORDER] Plan not found:', { planId, category });
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    if (plan.priceUSD === 0) {
      console.log('❌ [CREATE-ORDER] Free plan - should use activate-free-plan endpoint');
      return res.status(400).json({ success: false, message: 'Free plans do not require payment' });
    }

    console.log('💰 [CREATE-ORDER] Plan found, price:', plan.priceUSD);

    const isIndia = isUserFromIndia(req);
    const amount = convertToPaymentCurrency(plan.priceUSD, isIndia);
    const currency = isIndia ? 'INR' : 'USD';

    console.log('💱 [CREATE-ORDER] Currency conversion:', { isIndia, amount, currency, originalUSD: plan.priceUSD });

    const options = {
      amount,
      currency,
      receipt: `${category}_${planId}_${Date.now()}`,
      payment_capture: 1,
      notes: {
        planId: plan.planId,
        category: plan.category,
        userId: req.user._id.toString(),
        usdPrice: plan.priceUSD
      }
    };

    console.log('📝 [CREATE-ORDER] Razorpay options:', options);
    console.log('🔑 [CREATE-ORDER] Razorpay keys check:', { 
      keyIdExists: !!key_id, 
      keySecretExists: !!key_secret,
      keyIdLength: key_id?.length,
      keySecretLength: key_secret?.length 
    });

    const order = await razorpay.orders.create(options);
    console.log('✅ [CREATE-ORDER] Razorpay order created:', { orderId: order.id, amount: order.amount });

    // Save order to database
    const orderData = new Order({
      userId: req.user._id,
      planId: plan.planId,
      category: plan.category,
      amount: plan.priceUSD,
      currency: 'USD', // We always store USD in our database for consistency
      paymentCurrency: currency,
      paymentAmount: amount,
      razorpayOrderId: order.id,
      status: 'created'
    });

    console.log('💾 [CREATE-ORDER] Saving order to database:', {
      userId: req.user._id,
      planId: plan.planId,
      category: plan.category,
      razorpayOrderId: order.id
    });

    await orderData.save();
    console.log('✅ [CREATE-ORDER] Order saved to database successfully');

    res.json({ 
      success: true, 
      order, 
      key_id,
      displayAmount: `$${plan.priceUSD}`,
      actualCurrency: currency,
      actualAmount: currency === 'INR' ? `₹${(amount / 100).toFixed(2)}` : `$${(amount / 100).toFixed(2)}`
    });

  } catch (err) {
    console.error('❌ [CREATE-ORDER] Error occurred:', err);
    console.error('❌ [CREATE-ORDER] Error stack:', err.stack);
    res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
});

// TEST ENDPOINT - Remove after debugging
router.post('/test-create-order', async (req, res) => {
  try {
    console.log('🧪 [TEST] Testing order creation without auth...');
    
    const { planId, category } = req.body;
    console.log('🧪 [TEST] Request body:', { planId, category });
    
    // Mock user ID for testing
    const mockUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
    
    const plan = await PricingPlan.findOne({ planId, category, isActive: true });
    console.log('🧪 [TEST] Plan found:', !!plan);
    
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plan not found' });
    }
    
    const amount = Math.round(plan.priceUSD * 100);
    const options = {
      amount,
      currency: 'USD',
      receipt: `test_${Date.now()}`,
      payment_capture: 1,
      notes: { test: 'debug', planId, category }
    };
    
    console.log('🧪 [TEST] Creating Razorpay order...');
    const order = await razorpay.orders.create(options);
    console.log('🧪 [TEST] Razorpay order created:', order.id);
    
    res.json({ 
      success: true, 
      message: 'Test order created successfully',
      orderId: order.id,
      amount: order.amount,
      plan: { planId: plan.planId, price: plan.priceUSD }
    });
    
  } catch (err) {
    console.error('🧪 [TEST] Error:', err);
    res.status(500).json({ success: false, message: 'Test failed', error: err.message });
  }
});

// ==========================================
// ACTIVATE FREE PLAN (No Payment Required)
// ==========================================
router.post('/activate-free-plan', authenticateToken, async (req, res) => {
  try {
    const { planId, category } = req.body;

    // Get plan details from database
    const plan = await PricingPlan.findOne({ planId, category, isActive: true, priceUSD: 0 });
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid free plan' });
    }

    // Update user subscription
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate subscription end date
    let endDate = new Date();
    switch (plan.duration) {
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '6-months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        endDate.setFullYear(endDate.getFullYear() + 100);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    if (category === 'script-generator') {
      // Script Generator subscription
      user.scriptGeneratorSubscription = {
        planId: plan.planId,
        status: 'active',
        startDate: new Date(),
        endDate: endDate,
        isUnlimited: false,
        usageCount: 0,
        monthlyResetDate: new Date()
      };
    } else if (category === 'store') {
      // Store listing subscription  
      user.storeSubscription = {
        planId: plan.planId,
        status: 'active',
        startDate: new Date(),
        endDate: endDate,
        listingType: plan.name
      };
    }

    await user.save();

    res.json({ 
      success: true, 
      message: `${category === 'script-generator' ? 'Script Generator' : 'Store'} free plan activated successfully!`,
      data: { 
        user: {
          id: user._id,
          scriptGeneratorSubscription: user.scriptGeneratorSubscription,
          storeSubscription: user.storeSubscription
        },
        plan: plan.toFrontendFormat()
      }
    });

  } catch (error) {
    console.error('Free Plan Activation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate free plan' });
  }
});

// ==========================================
// 2. VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
// ==========================================
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      planId,
      category 
    } = req.body;

    // 1. Verify Payment Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Get plan and order details
    const plan = await PricingPlan.findOne({ planId, category, isActive: true });
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!plan || !order) {
      return res.status(404).json({ success: false, message: 'Plan or order not found' });
    }

    // 3. Update order status
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = 'completed';
    await order.save();

    // 4. Update user subscription based on category
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate subscription end date based on plan duration
    let endDate = new Date();
    switch (plan.duration) {
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '6-months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        endDate.setFullYear(endDate.getFullYear() + 100); // Far future date
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    if (category === 'script-generator') {
      // Script Generator subscription
      user.scriptGeneratorSubscription = {
        planId: plan.planId,
        status: 'active',
        startDate: new Date(),
        endDate: endDate,
        isUnlimited: plan.planId === 'script-creator'
      };
    } else if (category === 'store') {
      // Store listing subscription
      user.storeSubscription = {
        planId: plan.planId,
        status: 'active', 
        startDate: new Date(),
        endDate: endDate,
        listingType: plan.name
      };
    }

    await user.save();

    res.json({ 
      success: true, 
      message: `${category === 'script-generator' ? 'Script Generator' : 'Store'} subscription activated successfully!`,
      data: { 
        user: {
          id: user._id,
          scriptGeneratorSubscription: user.scriptGeneratorSubscription,
          storeSubscription: user.storeSubscription
        },
        plan: plan.toFrontendFormat()
      }
    });

  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// ==========================================
// 3. GET USER SUBSCRIPTION STATUS
// ==========================================
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('scriptGeneratorSubscription storeSubscription');
    
    res.json({
      success: true,
      data: {
        scriptGenerator: user.scriptGeneratorSubscription || { status: 'free' },
        store: user.storeSubscription || { status: 'none' }
      }
    });

  } catch (error) {
    console.error('Subscription Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
});

// ==========================================
// 4. GET AVAILABLE PLANS BY CATEGORY
// ==========================================
router.get('/plans/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!['store', 'script-generator'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const plans = await PricingPlan.getPlansByCategory(category);
    const formattedPlans = plans.map(plan => plan.toFrontendFormat());

    res.json({ success: true, data: formattedPlans });

  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get plans' });
  }
});

// ==========================================
// 5. GET ALL PRICING PLANS (FOR FRONTEND)
// ==========================================
router.get('/pricing-plans', async (req, res) => {
  try {
    const { category } = req.query;
    
    let plans;
    if (category) {
      plans = await PricingPlan.getPlansByCategory(category, true);
    } else {
      plans = await PricingPlan.find({ isActive: true }).sort({ category: 1, displayOrder: 1 });
    }
    
    // Convert to frontend format
    const frontendPlans = plans.map(plan => plan.toFrontendFormat());
    
    res.json({
      success: true,
      data: {
        plans: frontendPlans,
        categories: {
          store: frontendPlans.filter(p => {
            const original = plans.find(original => original.planId === p.id);
            return original && original.category === 'store';
          }),
          scriptGenerator: frontendPlans.filter(p => {
            const original = plans.find(original => original.planId === p.id);
            return original && original.category === 'script-generator';
          })
        }
      }
    });
  } catch (error) {
    console.error('Get Pricing Plans Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pricing plans' });
  }
    });

// Complete/Verify Subscription
router.post('/complete-subscription', authenticateToken, async (req, res) => {
  try {
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid Payment Signature' });
    }

    // 2. Update User Subscription
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let end = new Date();
    
    // Set subscription duration based on plan
    switch (planId) {
      case 'monthly':
      case 'pro': // Legacy: 1 month
        end.setMonth(end.getMonth() + 1);
        break;
      case 'six_months':
        end.setMonth(end.getMonth() + 6);
        break;
      case 'annual':
      case 'enterprise': // Legacy: 1 year
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'lifetime':
        end.setFullYear(end.getFullYear() + 100); // Lifetime = 100 years
        break;
      default:
        end.setMonth(end.getMonth() + 1); // Default fallback: 1 month
    }

    user.subscriptionType = 'pro';
    user.isProUser = true;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();
    user.subscriptionEndDate = end;
    user.subscriptionPlanId = planId;

    await user.save();

    // ✅ 3. Update Order Status in DB
    await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'paid', razorpayPaymentId: razorpay_payment_id }
    );

    res.json({ success: true, message: 'Subscription active!', data: { user } });

  } catch (error) {
    console.error('Subscription Verification Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});


// ==========================================
// 2. BOOST FLOW (New Feature)
// ==========================================

// ✅ Create Boost Order (Dynamic Price: $1 * days)
router.post('/create-boost-order', authenticateToken, async (req, res) => {
  try {
    const { toolId, days } = req.body;

    if (!toolId || !days) {
      return res.status(400).json({ success: false, message: "Tool ID and Days are required" });
    }

    // Dynamic Price Calculation
    const PRICE_PER_DAY = 1; // $1 per day
    const amountInCents = Math.round(days * PRICE_PER_DAY * 100); // $1 * days * 100
    
    // Convert USD cents to INR paise for Indian users
    const amountInINRPaise = convertUSDCentsToINRPaise(amountInCents);

    const options = {
      amount: amountInINRPaise,
      currency: 'INR',
      receipt: `bst_${Date.now()}`,
      payment_capture: 1,
      notes: {
        toolId: String(toolId),  // <--- WRAP IN String()
        days: String(days),      // <--- WRAP IN String()
        type: "tool_boost"
          }
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save Boost Order to DB for history
    await Order.create({
        userId: req.user._id,
        planId: `boost_${days}_days`, // Custom ID to track it's a boost
        amount: amountInCents / 100, // Store original USD amount
        amountINR: amountInINRPaise / 100, // Store INR amount
        razorpayOrderId: order.id,
        status: 'created'
    });

    res.json({ success: true, order, key_id });

  } catch (err) {
    console.error('Boost Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create boost order' });
  }
});

// ✅ Verify Boost Payment & Activate Boost
router.post('/verify-boost', authenticateToken, async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      toolId,
      days 
    } = req.body;

    // 1. Verify Payment Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Get order details
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 3. Update order status
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = 'completed';
    await order.save();

    // 4. Boost the tool/model - update trending score and boost end date
    const model = await Model.findOneAndUpdate(
      { _id: toolId, userId: req.user._id }, // Ensure user owns the tool
      { 
        $inc: { trendingScore: 50 * parseInt(days) }, // Optional: Boost score based on days paid
        $set: { 
          isBoosted: true,
          boostEndDate: new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000) // Add boost days
        }
      },
      { new: true }
    );

    if (!model) {
      return res.status(404).json({ success: false, message: 'Tool not found or you are not the owner' });
    }

    res.json({ 
      success: true, 
      message: `Tool boosted for ${days} days!`, 
      data: { model } 
    });

  } catch (error) {
    console.error('Boost Verification Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

module.exports = router;