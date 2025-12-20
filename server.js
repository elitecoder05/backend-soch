// // // // const express = require('express');
// // // // const mongoose = require('mongoose');
// // // // const cors = require('cors');
// // // // require('dotenv').config();
// // // // // Initialize Firebase Admin SDK (will read env vars for credentials)
// // // // require('./services/firebaseAdmin');
// // // // const uploadRoutes = require('./routes/upload');
// // // // const contactRoutes = require('./routes/contact');
// // // // const app = express();
// // // // const PORT = process.env.PORT || 5000;

// // // // // Middleware
// // // // // Configure CORS - allow frontend(s) defined in env vars or default to localhost + the production frontend
// // // // const allowedOrigins = [
// // // //   process.env.FRONTEND_URL || 'http://localhost:5173',
// // // //   'https://www.sochai.store',
// // // //   'https://sochai.store',
// // // //   'http://localhost:3000',
// // // //   'http://localhost:5173',
// // // //   'http://localhost:2000'
// // // // ];

// // // // // CORS configuration using express cors middleware
// // // // app.use(cors({
// // // //   origin: function (origin, callback) {
// // // //     console.log(`[${new Date().toISOString()}] CORS: Processing origin: ${origin}`);
    
// // // //     // Allow requests with no origin (like mobile apps or curl requests)
// // // //     if (!origin) {
// // // //       console.log(`[${new Date().toISOString()}] CORS: No origin, allowing request`);
// // // //       return callback(null, true);
// // // //     }
    
// // // //     // Check if origin is in allowed list
// // // //     if (allowedOrigins.includes(origin)) {
// // // //       console.log(`[${new Date().toISOString()}] CORS: Origin ${origin} is allowed`);
// // // //       return callback(null, true);
// // // //     }
    
// // // //     // For production, log but still allow (can change this to be more restrictive)
// // // //     console.log(`[${new Date().toISOString()}] CORS: Origin ${origin} not in allowed list, but allowing anyway`);
// // // //     callback(null, true);
// // // //   },
// // // //   credentials: true,
// // // //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
// // // //   allowedHeaders: [
// // // //     'Content-Type', 
// // // //     'Authorization', 
// // // //     'X-Requested-With', 
// // // //     'Accept', 
// // // //     'Origin',
// // // //     'Access-Control-Request-Method',
// // // //     'Access-Control-Request-Headers'
// // // //   ],
// // // //   optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
// // // //   maxAge: 86400 // 24 hours
// // // // }));

// // // // // Ensure we allow popups to be checked for window.closed in cross-origin cases
// // // // // If your hosting provider already sets Cross-Origin-Opener-Policy, this may
// // // // // be overridden at the platform level. For best compatibility with OAuth popups
// // // // // (Google Sign-in popup), use `same-origin-allow-popups` where appropriate.
// // // // app.use((req, res, next) => {
// // // //   res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
// // // //   // Do not set `Cross-Origin-Embedder-Policy` unless necessary; it can cause
// // // //   // resource loading issues and stricter cross-origin restrictions.
// // // //   next();
// // // // });
// // // // app.use(express.json());
// // // // app.use(express.urlencoded({ extended: true }));

// // // // // Database connection middleware for protected routes
// // // // const checkDatabaseConnection = (req, res, next) => {
// // // //   if (mongoose.connection.readyState !== 1) {
// // // //     return res.status(503).json({
// // // //       success: false,
// // // //       message: 'Database connection is not ready. Please try again in a moment.',
// // // //       error: 'Database not connected'
// // // //     });
// // // //   }
// // // //   next();
// // // // };

// // // // // Import routes
// // // // const authRoutes = require('./routes/auth');
// // // // const modelRoutes = require('./routes/models');
// // // // const categoriesRoutes = require('./routes/categories');
// // // // const testRoutes = require('./routes/test');
// // // // const paymentsRoutes = require('./routes/payments');

// // // // // MongoDB Connection
// // // // const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sochai-backend';

// // // // // Connection options for Render free services (slow response times)
// // // // const mongoOptions = {
// // // //   serverSelectionTimeoutMS: 100000, // 100 seconds
// // // //   socketTimeoutMS: 100000, // 100 seconds
// // // //   connectTimeoutMS: 100000, // 100 seconds
// // // //   bufferCommands: false,
// // // //   maxPoolSize: 10,
// // // //   minPoolSize: 5
// // // // };



// // // // // Routes
// // // // app.get('/', (req, res) => {
// // // //   res.json({ message: 'SochAI Backend API is running!' });
// // // // });

// // // // // Authentication routes (protected with database connection check)
// // // // app.use('/api/auth', checkDatabaseConnection, authRoutes);

// // // // // Model routes (protected with database connection check)
// // // // app.use('/api/models', checkDatabaseConnection, modelRoutes);

// // // // // Categories (public endpoint - but depends on database for counts)
// // // // app.use('/api/categories', checkDatabaseConnection, categoriesRoutes);

// // // // // Test routes (for development only)
// // // // app.use('/api/test', checkDatabaseConnection, testRoutes);

// // // // // Payments (Razorpay) routes
// // // // app.use('/api/payments', checkDatabaseConnection, paymentsRoutes);

// // // // // Simple POST API that returns "Hello World"
// // // // app.post('/api/hello', (req, res) => {
// // // //   res.json({ 
// // // //     message: 'Hello World',
// // // //     timestamp: new Date().toISOString(),
// // // //     method: 'POST'
// // // //   });
// // // // });

// // // // // CORS test endpoint
// // // // app.get('/api/cors-test', (req, res) => {
// // // //   console.log('CORS test endpoint hit from origin:', req.headers.origin);
// // // //   res.json({
// // // //     message: 'CORS test successful',
// // // //     origin: req.headers.origin,
// // // //     timestamp: new Date().toISOString(),
// // // //     method: req.method,
// // // //     headers: req.headers
// // // //   });
// // // // });

// // // // // Simple OPTIONS handler for testing
// // // // app.options('/api/cors-test', (req, res) => {
// // // //   console.log('OPTIONS request for cors-test from:', req.headers.origin);
// // // //   res.status(200).end();
// // // // });

// // // // // Health check endpoint
// // // // app.get('/api/health', (req, res) => {
// // // //   res.json({ 
// // // //     status: 'OK', 
// // // //     timestamp: new Date().toISOString(),
// // // //     database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
// // // //   });
// // // // });

// // // // // Connect to MongoDB and start server
// // // // const startServer = async () => {
// // // //   try {
// // // //     await mongoose.connect(mongoURI, mongoOptions);
// // // //     console.log('Connected to MongoDB successfully');
    
// // // //     // Start server only after database connection is established
// // // //     app.listen(PORT, () => {
// // // //       console.log(`Server is running on port ${PORT}`);
// // // //       console.log(`API endpoints:`);
// // // //       console.log(`- GET  /api/health`);
// // // //       console.log(`- POST /api/hello`);
// // // //       console.log(`- POST /api/auth/signup`);
// // // //       console.log(`- POST /api/auth/login`);
// // // //       console.log(`- POST /api/models (protected)`);
// // // //       console.log(`- GET  /api/models`);
// // // //       console.log(`- GET  /api/categories`);
// // // //       console.log(`- GET  /api/models/my-models (protected)`);
// // // //       console.log(`- GET  /api/models/:id`);
// // // //       console.log(`- PUT  /api/models/:id (protected)`);
// // // //       console.log(`- DELETE /api/models/:id (protected)`);
// // // //     });
// // // //   } catch (error) {
// // // //     console.error('Failed to connect to MongoDB:', error);
// // // //     process.exit(1); // Exit the process if database connection fails
// // // //   }
// // // // };

// // // // // Start the server
// // // // startServer();

// // // // module.exports = app;






// // // const express = require('express');
// // // const mongoose = require('mongoose');
// // // const cors = require('cors');
// // // require('dotenv').config();

// // // // Initialize Firebase Admin SDK (will read env vars for credentials)
// // // require('./services/firebaseAdmin');

// // // // Import Route Handlers
// // // const authRoutes = require('./routes/auth');
// // // const modelRoutes = require('./routes/models');
// // // const categoriesRoutes = require('./routes/categories');
// // // const testRoutes = require('./routes/test');
// // // const paymentsRoutes = require('./routes/payments');
// // // const uploadRoutes = require('./routes/upload');  // <--- ADDED
// // // const contactRoutes = require('./routes/contact'); // <--- ADDED

// // // const app = express();
// // // const PORT = process.env.PORT || 5000;

// // // // --- MIDDLEWARE SETUP ---

// // // // Configure CORS
// // // const allowedOrigins = [
// // //   process.env.FRONTEND_URL || 'http://localhost:5173',
// // //   'https://www.sochai.store',
// // //   'https://sochai.store',
// // //   'http://localhost:3000',
// // //   'http://localhost:5173',
// // //   'http://localhost:2000'
// // // ];

// // // app.use(cors({
// // //   origin: function (origin, callback) {
// // //     console.log(`[${new Date().toISOString()}] CORS: Processing origin: ${origin}`);
// // //     // Allow requests with no origin (like mobile apps or curl requests)
// // //     if (!origin) return callback(null, true);
// // //     if (allowedOrigins.includes(origin)) {
// // //       return callback(null, true);
// // //     }
// // //     console.log(`[${new Date().toISOString()}] CORS: Origin ${origin} not in allowed list, but allowing anyway`);
// // //     callback(null, true);
// // //   },
// // //   credentials: true,
// // //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
// // //   allowedHeaders: [
// // //     'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin',
// // //     'Access-Control-Request-Method', 'Access-Control-Request-Headers'
// // //   ],
// // //   optionsSuccessStatus: 200,
// // //   maxAge: 86400
// // // }));

// // // // Security headers for popups
// // // app.use((req, res, next) => {
// // //   res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
// // //   next();
// // // });

// // // app.use(express.json());
// // // app.use(express.urlencoded({ extended: true }));

// // // // Database connection check middleware
// // // const checkDatabaseConnection = (req, res, next) => {
// // //   if (mongoose.connection.readyState !== 1) {
// // //     return res.status(503).json({
// // //       success: false,
// // //       message: 'Database connection is not ready. Please try again in a moment.',
// // //       error: 'Database not connected'
// // //     });
// // //   }
// // //   next();
// // // };

// // // // --- ROUTE MOUNTING ---

// // // app.get('/', (req, res) => {
// // //   res.json({ message: 'SochAI Backend API is running!' });
// // // });

// // // // Authentication (Protected by DB Check)
// // // app.use('/api/auth', checkDatabaseConnection, authRoutes);

// // // // Models (Protected by DB Check)
// // // app.use('/api/models', checkDatabaseConnection, modelRoutes);

// // // // Categories (Public, but needs DB)
// // // app.use('/api/categories', checkDatabaseConnection, categoriesRoutes);

// // // // Payments (Protected by DB Check)
// // // app.use('/api/payments', checkDatabaseConnection, paymentsRoutes);

// // // // File Uploads (Uses Firebase, but usually needs DB to log uploads or check user auth)
// // // app.use('/api/upload', checkDatabaseConnection, uploadRoutes); // <--- ROUTE MOUNTED HERE

// // // // Contact Form (Often just email, but good to have DB check if logging inquiries)
// // // app.use('/api/contact', contactRoutes); // <--- ROUTE MOUNTED HERE

// // // // Test Routes
// // // app.use('/api/test', checkDatabaseConnection, testRoutes);

// // // // --- UTILITY ENDPOINTS ---

// // // app.post('/api/hello', (req, res) => {
// // //   res.json({ message: 'Hello World', timestamp: new Date().toISOString(), method: 'POST' });
// // // });

// // // app.get('/api/health', (req, res) => {
// // //   res.json({ 
// // //     status: 'OK', 
// // //     timestamp: new Date().toISOString(),
// // //     database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
// // //   });
// // // });

// // // app.get('/api/cors-test', (req, res) => {
// // //   res.json({ message: 'CORS test successful', origin: req.headers.origin });
// // // });

// // // // --- SERVER STARTUP ---

// // // const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sochai-backend';
// // // const mongoOptions = {
// // //   serverSelectionTimeoutMS: 100000,
// // //   socketTimeoutMS: 100000,
// // //   connectTimeoutMS: 100000,
// // //   bufferCommands: false,
// // //   maxPoolSize: 10,
// // //   minPoolSize: 5
// // // };

// // // const startServer = async () => {
// // //   try {
// // //     await mongoose.connect(mongoURI, mongoOptions);
// // //     console.log('Connected to MongoDB successfully');
    
// // //     app.listen(PORT, () => {
// // //       console.log(`Server is running on port ${PORT}`);
// // //       console.log(`API endpoints:`);
// // //       console.log(`- POST /api/auth/login`);
// // //       console.log(`- POST /api/upload/image (New)`);
// // //       console.log(`- POST /api/contact (New)`);
// // //       console.log(`- POST /api/payments/create-order`);
// // //     });
// // //   } catch (error) {
// // //     console.error('Failed to connect to MongoDB:', error);
// // //     process.exit(1);
// // //   }
// // // };

// // // startServer();

// // // module.exports = app;
// // const express = require('express');
// // const cors = require('cors');
// // require('dotenv').config();

// // // Initialize Firebase Admin SDK
// // require('./services/firebaseAdmin');

// // // Import Routes
// // const uploadRoutes = require('./routes/upload');
// // const contactRoutes = require('./routes/contact');
// // // Note: You will need to rewrite 'auth', 'models', 'categories', 'payments' 
// // // to use Firestore (db) instead of Mongoose models before uncommenting them.
// // // const authRoutes = require('./routes/auth');
// // // const modelRoutes = require('./routes/models');

// // const app = express();
// // // Using port 1000 as requested/observed in logs
// // const PORT = process.env.PORT || 1000;

// // // --- MIDDLEWARE ---
// // const allowedOrigins = [
// //   process.env.FRONTEND_URL || 'http://localhost:5173',
// //   'https://www.sochai.store',
// //   'http://localhost:1000',
// //   'http://127.0.0.1:1000'
// // ];

// // app.use(cors({
// //   origin: function (origin, callback) {
// //     if (!origin) return callback(null, true);
// //     if (allowedOrigins.includes(origin)) return callback(null, true);
// //     // Allow for development convenience
// //     callback(null, true); 
// //   },
// //   credentials: true
// // }));

// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // // --- ROUTES ---
// // app.get('/', (req, res) => {
// //   res.json({ message: 'SochAI Backend (Firebase Mode) is running!' });
// // });

// // // Upload & Contact Routes (These now use Firebase/Firestore)
// // app.use('/api/upload', uploadRoutes);
// // app.use('/api/contact', contactRoutes);

// // // --- SERVER STARTUP ---
// // app.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// //   console.log(`Connected to Firebase Firestore`);
// //   console.log(`API endpoints available:`);
// //   console.log(`- POST /api/upload/image`);
// //   console.log(`- POST /api/contact`);
// // });

// // module.exports = app;








// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// // Initialize Firebase (for Auth and Images)
// require('./services/firebaseAdmin');

// // Import Routes
// const uploadRoutes = require('./routes/upload');
// const contactRoutes = require('./routes/contact');
// const modelRoutes = require('./routes/models'); // We will use the Mongoose version
// // const authRoutes = require('./routes/auth'); // Optional if managing users in Mongo

// const app = express();
// const PORT = process.env.PORT || 1000;

// // --- MIDDLEWARE ---
// const allowedOrigins = [
//   process.env.FRONTEND_URL || 'http://localhost:5173',
//   'https://www.sochai.store',
//   'http://localhost:1000',
//   'http://127.0.0.1:1000'
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     callback(null, true); 
//   },
//   credentials: true
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // --- DATABASE CONNECTION (MongoDB) ---
// const mongoURI = process.env.MONGODB_URI;

// mongoose.connect(mongoURI, {
//   serverSelectionTimeoutMS: 5000
// }).then(() => {
//   console.log('✅ Connected to MongoDB successfully');
// }).catch(err => {
//   console.error('❌ MongoDB Connection Error:', err.message);
// });

// // Middleware to ensure DB is ready
// const checkDb = (req, res, next) => {
//   if (mongoose.connection.readyState !== 1) {
//     return res.status(503).json({ message: 'Database not connected' });
//   }
//   next();
// };

// // --- ROUTES ---
// app.get('/', (req, res) => {
//   res.json({ message: 'SochAI Backend (MERN + Firebase) is running!' });
// });

// app.use('/api/upload', uploadRoutes); // Uses Firebase Storage
// app.use('/api/contact', contactRoutes);
// app.use('/api/models', checkDb, modelRoutes); // Uses MongoDB

// // --- START SERVER ---
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase (for Auth verification & Image Uploads)
require('./services/firebaseAdmin');

// Import Routes
const uploadRoutes = require('./routes/upload'); // Uses Firebase Storage
const contactRoutes = require('./routes/contact');
const modelRoutes = require('./routes/models');  // Uses MongoDB
const authRoutes = require('./routes/auth');     // Uses MongoDB + Firebase

const app = express();
const PORT = process.env.PORT || 1000; // Matches your error log port

// --- MIDDLEWARE ---
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://www.sochai.store',
  'http://localhost:1000',
  'http://127.0.0.1:1000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Development: Allow requests from localhost
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      return callback(null, true);
    }
    console.log('Blocked by CORS:', origin);
    callback(null, true); // Permissive for dev, tighten for prod
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DATABASE CONNECTION (MongoDB) ---
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
}).then(() => {
  console.log('✅ Connected to MongoDB successfully');
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1); // Exit if DB fails
});

// Middleware to ensure DB is ready
const checkDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connecting...' });
  }
  next();
};

// --- ROUTES ---
app.get('/', (req, res) => {
  res.json({ message: 'SochAI Hybrid Backend is running!' });
});

// 1. Uploads (Firebase Storage)
app.use('/api/upload', uploadRoutes);

// 2. Models (MongoDB Data + Firebase Auth)
app.use('/api/models', checkDb, modelRoutes);

// 3. Auth (Signup/Login handling in MongoDB)
app.use('/api/auth', checkDb, authRoutes);

// 4. Contact
app.use('/api/contact', contactRoutes);

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`- Database: MongoDB`);
  console.log(`- Storage: Firebase`);
});

module.exports = app;