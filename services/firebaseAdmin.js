/*
Backend Firebase Admin initialization.

This file sets up firebase-admin using either of the following approaches (in order of preference):
1) FIREBASE_SERVICE_ACCOUNT env var — should contain BASE64-encoded JSON of the service account key.
   - This is helpful for platform env var injection (e.g., Render, Heroku, Vercel Serverless) where writing files isn't ideal.
2) GOOGLE_APPLICATION_CREDENTIALS env var — path to a JSON service account file on disk.

Add either approach to your environment and the code will initialize the admin SDK accordingly.

Usage:
const { admin } = require('./services/firebaseAdmin');

*/

const fs = require('fs');
const path = require('path');
const adminLib = require('firebase-admin');

function initFirebaseAdmin() {
  if (adminLib.apps && adminLib.apps.length > 0) {
    // Already initialized
    return adminLib;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountBase64) {
    try {
      const jsonStr = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(jsonStr);

      adminLib.initializeApp({
        credential: adminLib.credential.cert(serviceAccount),
      });

      console.log('Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_BASE64 / FIREBASE_SERVICE_ACCOUNT');
      return adminLib;
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err);
      throw err;
    }
  }

  // Try to use application default credentials (ADC).
  // This covers Cloud provider environments (Compute Engine, Cloud Run, etc.)
  // that provide credentials via the metadata server without needing to set
  // GOOGLE_APPLICATION_CREDENTIALS. Also, check for a local JSON file fallback
  // (useful for local development) and set the env var only in that case.
  const localCandidate = path.join(process.cwd(), 'sochai-2025-firebase-adminsdk-fbsvc-31f0840034.json');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localCandidate)) {
    // Local dev convenience: set the env var to the local credentials file
    // so applicationDefault() can pick it up.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = localCandidate;
    console.log('Detected local Firebase service account:', localCandidate);
  }

  try {
    adminLib.initializeApp({
      credential: adminLib.credential.applicationDefault(),
    });
    console.log('Firebase Admin initialized using applicationDefault()');
    return adminLib;
  } catch (err) {
    // If ADC is unavailable, initialization will throw — we'll catch the error
    // and log a friendly message below explaining available options.
    console.error('Failed to initialize with applicationDefault():', err.message);
  }

  // For development: skip Firebase Admin initialization if no credentials
  // This prevents the metadata server error in local development
  console.warn('Firebase Admin not initialized: No service account credentials found.');
  console.warn('Google Sign-in will not work without proper Firebase Admin credentials.');
  console.warn('To enable Google Sign-in, provide one of the following environment variables:');
  console.warn('- FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded service account JSON)');
  console.warn('- GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON file)');
  
  // Return null to indicate Firebase Admin is not available
  return null;
}

// Initialize and export
let admin = null;
try {
  admin = initFirebaseAdmin();
} catch (error) {
  console.error('Firebase Admin initialization failed:', error.message);
  admin = null;
}

module.exports = { admin, initFirebaseAdmin };
