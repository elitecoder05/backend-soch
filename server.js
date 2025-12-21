const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase
require('./services/firebaseAdmin');


// Import Routes
const uploadRoutes = require('./routes/upload');
const contactRoutes = require('./routes/contact'); // ✅ Ensure this file exists
const modelRoutes = require('./routes/models');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 1000;

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  'http://localhost:5173', // Frontend Dev
  'http://localhost:1000',
  'https://www.sochai.store'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, true); 
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DATABASE ---
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  });

// --- ROUTES ---
app.use('/api/upload', uploadRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes); // ✅ Connects to routes/contact.js
app.use('/api/payments', paymentRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;