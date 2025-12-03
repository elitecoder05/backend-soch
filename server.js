const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// Initialize Firebase Admin SDK (will read env vars for credentials)
require('./services/firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS - allow frontend(s) defined in env vars or default to localhost + the production frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://www.sochai.store',
  'https://sochai.store',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:2000'
];

// CORS configuration using express cors middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log(`[${new Date().toISOString()}] CORS: Processing origin: ${origin}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log(`[${new Date().toISOString()}] CORS: No origin, allowing request`);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`[${new Date().toISOString()}] CORS: Origin ${origin} is allowed`);
      return callback(null, true);
    }
    
    // For production, log but still allow (can change this to be more restrictive)
    console.log(`[${new Date().toISOString()}] CORS: Origin ${origin} not in allowed list, but allowing anyway`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  maxAge: 86400 // 24 hours
}));

// Ensure we allow popups to be checked for window.closed in cross-origin cases
// If your hosting provider already sets Cross-Origin-Opener-Policy, this may
// be overridden at the platform level. For best compatibility with OAuth popups
// (Google Sign-in popup), use `same-origin-allow-popups` where appropriate.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Do not set `Cross-Origin-Embedder-Policy` unless necessary; it can cause
  // resource loading issues and stricter cross-origin restrictions.
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection middleware for protected routes
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is not ready. Please try again in a moment.',
      error: 'Database not connected'
    });
  }
  next();
};

// Import routes
const authRoutes = require('./routes/auth');
const modelRoutes = require('./routes/models');
const categoriesRoutes = require('./routes/categories');
const testRoutes = require('./routes/test');
const paymentsRoutes = require('./routes/payments');

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sochai-backend';

// Connection options for Render free services (slow response times)
const mongoOptions = {
  serverSelectionTimeoutMS: 100000, // 100 seconds
  socketTimeoutMS: 100000, // 100 seconds
  connectTimeoutMS: 100000, // 100 seconds
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 5
};



// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SochAI Backend API is running!' });
});

// Authentication routes (protected with database connection check)
app.use('/api/auth', checkDatabaseConnection, authRoutes);

// Model routes (protected with database connection check)
app.use('/api/models', checkDatabaseConnection, modelRoutes);

// Categories (public endpoint - but depends on database for counts)
app.use('/api/categories', checkDatabaseConnection, categoriesRoutes);

// Test routes (for development only)
app.use('/api/test', checkDatabaseConnection, testRoutes);

// Payments (Razorpay) routes
app.use('/api/payments', checkDatabaseConnection, paymentsRoutes);

// Simple POST API that returns "Hello World"
app.post('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello World',
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint hit from origin:', req.headers.origin);
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers
  });
});

// Simple OPTIONS handler for testing
app.options('/api/cors-test', (req, res) => {
  console.log('OPTIONS request for cors-test from:', req.headers.origin);
  res.status(200).end();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(mongoURI, mongoOptions);
    console.log('Connected to MongoDB successfully');
    
    // Start server only after database connection is established
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API endpoints:`);
      console.log(`- GET  /api/health`);
      console.log(`- POST /api/hello`);
      console.log(`- POST /api/auth/signup`);
      console.log(`- POST /api/auth/login`);
      console.log(`- POST /api/models (protected)`);
      console.log(`- GET  /api/models`);
      console.log(`- GET  /api/categories`);
      console.log(`- GET  /api/models/my-models (protected)`);
      console.log(`- GET  /api/models/:id`);
      console.log(`- PUT  /api/models/:id (protected)`);
      console.log(`- DELETE /api/models/:id (protected)`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1); // Exit the process if database connection fails
  }
};

// Start the server
startServer();

module.exports = app;