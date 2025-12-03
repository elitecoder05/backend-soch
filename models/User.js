const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: false, // Made optional for Google sign-in users
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters'],
    default: 'User'
  },
  lastName: {
    type: String,
    required: false, // Made optional for Google sign-in users
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
    required: false, // Made optional for Google sign-in users
    trim: true,
    match: [
      /^[6-9]\d{9}$/,
      'Please enter a valid 10-digit mobile number'
    ]
  },
  password: {
    type: String,
    required: false, // Made optional for Google sign-in users
    validate: {
      validator: function(v) {
        // Only validate length if password is provided (not empty string)
        return !v || v.length >= 6;
      },
      message: 'Password must be at least 6 characters long'
    }
  },
  // Google authentication fields
  googleUid: {
    type: String,
    sparse: true, // Allows null values but ensures uniqueness when present
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
    enum: ['free', 'pro', 'enterprise'],
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
  isProUser: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Custom validation: Either Google auth OR traditional signup is required
userSchema.pre('save', function(next) {
  // If this is a Google user (has googleUid), only email is required
  if (this.googleUid) {
    // Set default values for Google users if not provided
    if (!this.firstName) this.firstName = 'User';
    if (!this.lastName) this.lastName = '';
    return next();
  }
  
  // For traditional signup, all fields are required
  if (!this.firstName) {
    return next(new Error('First name is required for traditional signup'));
  }
  
  if (!this.lastName) {
    return next(new Error('Last name is required for traditional signup'));
  }
  
  if (!this.mobileNumber) {
    return next(new Error('Mobile number is required for traditional signup'));
  }
  
  if (!this.password) {
    return next(new Error('Password is required for traditional signup'));
  }
  
  next();
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);