const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { admin } = require('../services/firebaseAdmin');
const { authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// --- Validation Schemas ---
const signupSchema = Joi.object({
  firstName: Joi.string().trim().max(50).required(),
  lastName: Joi.string().trim().max(50).required(),
  email: Joi.string().email().required(),
  mobileNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// =================================================================
// 1. ADMIN USER MANAGEMENT ROUTES
// =================================================================

// GET /api/auth/admin/users - List all users for Admin Dashboard
router.get('/admin/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    // Map _id to id for frontend compatibility
    const mappedUsers = users.map(user => ({
      ...user.toObject(),
      id: user._id
    }));
    
    res.status(200).json({ success: true, data: { users: mappedUsers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/auth/admin/toggle-subscription/:userId - Toggle PRO/FREE
router.put('/admin/toggle-subscription/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Toggle Logic
    const newIsProUser = !user.isProUser;
    user.isProUser = newIsProUser;
    user.subscriptionType = newIsProUser ? 'pro' : 'free';
    user.subscriptionStatus = newIsProUser ? 'active' : 'inactive';
    
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: `User subscription toggled to ${newIsProUser ? 'PRO' : 'FREE'}`,
      data: { user: { ...user.toObject(), id: user._id } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 2. AUTHENTICATION ROUTES
// =================================================================

// POST /api/auth/signup - Standard Signup
router.post('/signup', async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { firstName, lastName, email, mobileNumber, password } = value;
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { mobileNumber }] 
    });

    if (existingUser) return res.status(400).json({ success: false, message: 'User with this email or mobile already exists' });

    const user = new User({
      firstName, lastName, email: email.toLowerCase(), mobileNumber, password,
      // Default 14-day trial
      subscriptionType: 'trial', isProUser: true, subscriptionStatus: 'trial',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });

    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({ success: true, message: 'User created successfully', data: { user, token } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/login - Standard Login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { email, password } = value;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.googleUid && !user.password) return res.status(400).json({ success: false, message: 'Please use "Sign in with Google"' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = generateToken(user._id);
    res.json({ success: true, message: 'Login successful', data: { user, token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/google-signin - Google Login/Signup Sync
router.post('/google-signin', async (req, res) => {
  try {
    console.log("🔥 GOOGLE LOGIN ROUTE HIT - CHECKING CODE VERSION 🔥");
    const authHeader = req.headers['authorization'];
    const idToken = authHeader && authHeader.split(' ')[1]; 
    if (!idToken) return res.status(401).json({ success: false, message: 'Firebase ID token missing' });

    if (!admin) return res.status(500).json({ success: false, message: 'Firebase Admin not initialized' });
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // EXISTING USER FOUND
      let updatesMade = false;

      // 1. Link Google Account if missing
      if (!user.googleUid) {
        user.googleUid = uid;
        if (!user.profilePicture) user.profilePicture = picture;
        updatesMade = true;
      }

      // 2. FIX MISSING ROLE (Self-Healing)
      // This fixes old users like "Bot" who might have 'undefined' role
      if (!user.role) {
        user.role = 'user';
        updatesMade = true;
      }

      // Only save if we actually changed something to avoid unnecessary DB writes
      if (updatesMade) {
        await user.save();
      }
    } else {
      // CREATE NEW USER
      const displayName = name || 'User';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = new User({
        firstName, lastName, email: email.toLowerCase(), googleUid: uid,
        profilePicture: picture || '', mobileNumber: '', password: '', isEmailVerified: true,
        
        // EXPLICITLY SET ROLE FOR SAFETY
        role: 'user', 

        // Default 14-day trial
        subscriptionType: 'trial', isProUser: true, subscriptionStatus: 'trial',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      });
      await user.save();
    }

    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: 'Google sign-in successful', data: { user, token } });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }
});

// GET /api/auth/me - Current Profile & Auto-Downgrade
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user; 
    // Check expiration
    if (user.subscriptionEndDate && new Date() > new Date(user.subscriptionEndDate)) {
      if (user.subscriptionType !== 'free') {
        user.subscriptionType = 'free';
        user.isProUser = false;
        user.subscriptionStatus = 'inactive';
        user.subscriptionEndDate = null;
        await user.save();
      }
    }
    console.log("ewewew",req.token)
    res.json({ success: true, data: { user },token: req.token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});


// GET /api/auth/admin/messages - Fetch all messages
router.get('/admin/messages', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/auth/admin/messages/:id/status - Update status
router.put('/admin/messages/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    
    await Message.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// backend/routes/auth.js

// GET /api/auth/admin/stats
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Security Check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const Model = require('../models/Model');
    // const Order = require('../models/Order'); // Uncomment if you have an Order model

    // 2. Aggregate Data
    const totalUsers = await User.countDocuments();
    const totalModels = await Model.countDocuments();
    const pendingModels = await Model.countDocuments({ status: 'pending' });
    
    // Active Users (Logged in last 24h)
    const oneDayAgo = new Date(Date.now() - 24*60*60*1000);
    const activeUsers = await User.countDocuments({ updatedAt: { $gte: oneDayAgo } });

    // Calculate Total Views (Sum of all model clicks)
    const models = await Model.find({}, 'clicks');
    const totalViews = models.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

    // Placeholder for Revenue (Implement when Order model is ready)
    const totalRevenue = 0; 

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalModels,
        pendingModels,
        totalViews,
        totalRevenue
      }
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/admin/approve-all
router.post('/admin/approve-all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
        
        await require('../models/Model').updateMany(
            { status: 'pending' },
            { $set: { status: 'approved' } }
        );
        
        res.json({ success: true, message: 'All pending models approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;