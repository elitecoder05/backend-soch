const mongoose = require('mongoose');

// 👇 1. ADD THIS LOG TO VERIFY THE FILE LOADS
console.log("✅✅✅ USER MODEL LOADED (With Strict: False) ✅✅✅");

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters'],
    default: 'User'
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters'],
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: '' 
  },
  password: {
    type: String,
    // Validation removed for brevity, it's fine
  },
  googleUid: {
    type: String,
    sparse: true,
    unique: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  uploadedModels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model'
  }],
  subscriptionType: {
    type: String,
    enum: ['free', 'trial', 'pro', 'enterprise'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'trial'],
    default: 'active'
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  subscriptionPlanId: {
    type: String,
    default: null
  },
  isProUser: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  strict: false // 👈 2. THIS IS THE KEY FIX
});

// Pre-save hook
userSchema.pre('save', function(next) {
  if (this.googleUid) {
    if (!this.firstName) this.firstName = 'User';
    return next();
  }
  if (!this.firstName) return next(new Error('First name is required for signup'));
  if (!this.lastName) return next(new Error('Last name is required for signup'));
  if (!this.mobileNumber) return next(new Error('Mobile number is required for signup'));
  if (!this.password) return next(new Error('Password is required for signup'));
  next();
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);