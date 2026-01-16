// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// // Initialize Firebase
// require('./services/firebaseAdmin');


// // Import Routes
// const uploadRoutes = require('./routes/upload');
// const contactRoutes = require('./routes/contact'); // ✅ Ensure this file exists
// const modelRoutes = require('./routes/models');
// const authRoutes = require('./routes/auth');
// const paymentRoutes = require('./routes/payments');
// const categoryRoutes = require('./routes/categories');

// const app = express();
// const PORT = process.env.PORT || 1000;

// // --- CORS CONFIGURATION ---
// const allowedOrigins = [
//   'http://localhost:5173', // Frontend Dev (Vite default)
//   'http://localhost:2000', // Frontend Dev (custom port)
//   'http://localhost:1000',
//   'http://localhost:3000',
//   'https://www.sochai.store',
//   'https://sochai.store',  // Without www
//   'https://frontend-soch-production.up.railway.app', // Railway frontend
//   process.env.FRONTEND_URL // Custom frontend URL from env
// ].filter(Boolean); // Remove undefined/null values

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (mobile apps, curl, Postman, etc.)
//     if (!origin) return callback(null, true);
    
//     // Check if origin is in allowed list
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
    
//     // Allow localhost variations
//     if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
//       return callback(null, true);
//     }
    
//     // Allow all sochai.store subdomains
//     if (origin.endsWith('.sochai.store') || origin === 'https://sochai.store') {
//       return callback(null, true);
//     }
    
//     // Allow Railway app domains
//     if (origin.includes('.up.railway.app')) {
//       return callback(null, true);
//     }

//     // Allow Vercel preview deployments
//     if (origin.includes('.vercel.app')) {
//       return callback(null, true);
//     }

//     // Log blocked origins for debugging (remove in production if too noisy)
//     console.log(`[CORS] Blocked origin: ${origin}`);
//     callback(null, true); // Still allow for now, but logged
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
//   exposedHeaders: ['Content-Length', 'X-Request-Id'],
//   maxAge: 86400, // Cache preflight for 24 hours
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));

// // Handle preflight requests explicitly
// app.options('*', cors());

// // Additional headers for better compatibility across different networks/ISPs
// app.use((req, res, next) => {
//   // Add timing header for debugging slow connections
//   res.setHeader('X-Server-Time', Date.now().toString());
  
//   // Ensure proper content type handling
//   res.setHeader('X-Content-Type-Options', 'nosniff');
  
//   // Allow the response to be cached appropriately
//   if (req.method === 'GET' && !req.path.includes('/auth/')) {
//     res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache for GET requests
//   }
  
//   next();
// });

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // --- HEALTH CHECK ENDPOINT ---
// // Important for monitoring and debugging connectivity issues
// app.get('/api/health', (req, res) => {
//   // Add extra CORS headers for this endpoint to ensure maximum compatibility
//   res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
//   res.status(200).json({
//     success: true,
//     message: 'Server is healthy',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || 'development',
//     requestOrigin: req.headers.origin || 'no-origin',
//     requestIp: req.ip || req.headers['x-forwarded-for'] || 'unknown',
//     serverTime: Date.now()
//   });
// });

// // Simple ping endpoint for quick connectivity tests
// app.get('/api/ping', (req, res) => {
//   // Minimal response with maximum CORS compatibility
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Cache-Control', 'no-cache, no-store');
//   res.status(200).send('pong');
// });

// // Network diagnostics endpoint - helps debug regional ISP issues
// app.get('/api/diagnostics', (req, res) => {
//   res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.setHeader('Cache-Control', 'no-cache, no-store');
  
//   res.status(200).json({
//     success: true,
//     serverRegion: process.env.RAILWAY_REGION || 'unknown',
//     serverTimestamp: Date.now(),
//     clientInfo: {
//       ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
//       userAgent: req.headers['user-agent'] || 'unknown',
//       origin: req.headers.origin || 'no-origin',
//       host: req.headers.host || 'unknown'
//     },
//     message: 'If you can see this, your connection to the server is working.'
//   });
// });

// // --- DATABASE ---
// mongoose.connect(process.env.MONGODB_URI, {
//   serverSelectionTimeoutMS: 5000,
//   maxPoolSize: 10
// }).then(() => console.log('✅ Connected to MongoDB'))
//   .catch(err => {
//     console.error('❌ DB Error:', err.message);
//     process.exit(1);
//   });

// // --- ROUTES ---
// app.use('/api/upload', uploadRoutes);
// app.use('/api/models', modelRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/contact', contactRoutes); // ✅ Connects to routes/contact.js
// app.use('/api/payments', paymentRoutes);
// app.use('/api/categories', categoryRoutes);

// // Start Server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

// module.exports = app;


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase
require('./services/firebaseAdmin');

// Import Routes
const uploadRoutes = require('./routes/upload');
const contactRoutes = require('./routes/contact');
const modelRoutes = require('./routes/models');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const categoryRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 1000;

// ==========================================
// 🔒 ROBUST CORS CONFIGURATION (FIXED)
// ==========================================
const allowedOrigins = [
  'https://sochai.store',           // Main Domain
  'https://www.sochai.store',       // WWW Subdomain (Crucial Fix)
  'http://localhost:5173',          // Local Dev
  'http://localhost:2000',          // Local Dev (Custom Port)
  'http://localhost:1000',          
  'http://localhost:3000',
  'http://localhost:4173',          // Local Preview
  'https://frontend-soch-production.up.railway.app', // Railway Frontend
  process.env.FRONTEND_URL          // Env Variable Fallback
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // 1. Allow requests with no origin (like mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // 2. Check if the origin matches our allowed list exactly
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // 3. Dynamic Subdomain Check (Safety for preview branches)
    if (origin.endsWith('.sochai.store') || origin.endsWith('.up.railway.app')) {
      return callback(null, true);
    }

    console.log('[CORS Blocked]:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // <--- REQUIRED for cookies/auth to work
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'Set-Cookie'],
  maxAge: 86400, // Cache preflight for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Handle Preflight (OPTIONS) requests explicitly using the SAME config
app.options('*', cors(corsOptions));

// ==========================================
// MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
  // Add timing header for debugging slow connections
  res.setHeader('X-Server-Time', Date.now().toString());
  
  // Ensure proper content type handling
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Allow the response to be cached appropriately
  if (req.method === 'GET' && !req.path.includes('/auth/')) {
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache for GET requests
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// HEALTH CHECK ENDPOINTS (FIXED)
// ==========================================
app.get('/api/health', (req, res) => {
  // Removed manual Access-Control-Allow-Origin to prevent conflicts
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    requestOrigin: req.headers.origin || 'no-origin',
    serverTime: Date.now()
  });
});

app.get('/api/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.status(200).send('pong');
});

app.get('/api/diagnostics', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store');
  
  res.status(200).json({
    success: true,
    serverRegion: process.env.RAILWAY_REGION || 'unknown',
    serverTimestamp: Date.now(),
    clientInfo: {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      origin: req.headers.origin || 'no-origin',
      host: req.headers.host || 'unknown'
    },
    message: 'If you can see this, your connection to the server is working.'
  });
});

// ==========================================
// DATABASE & ROUTES
// ==========================================
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  });

app.use('/api/upload', uploadRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;