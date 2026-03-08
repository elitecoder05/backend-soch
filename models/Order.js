const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: String, 
    required: true
  },
  amount: {
    type: Number, 
    required: true
  },
  amountINR: {
    type: Number,
    // INR amount for convenient reference
  },
  currency: {
    type: String,
    default: 'USD'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'],
    default: 'created'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);