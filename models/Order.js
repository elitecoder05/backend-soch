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
  category: {
    type: String,
    enum: ['store', 'script-generator', 'boost'],
    required: true
  },
  amount: {
    type: Number, 
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentCurrency: {
    type: String,
    enum: ['USD', 'INR'],
    required: true
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  amountINR: {
    type: Number,
    // INR amount for convenient reference
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
    enum: ['created', 'paid', 'failed', 'completed'],
    default: 'created'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);