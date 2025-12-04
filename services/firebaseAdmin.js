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

  // Support for per-field environment variables. This allows storing each
  // field from the service account JSON in env vars (useful when platform
  // doesn't allow large or multi-line env vars). The `FIREBASE_PRIVATE_KEY`
  // value should contain escaped newlines ("\\n"); we convert them back.
  const hasPerField = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
  if (hasPerField) {
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    };

    try {
      adminLib.initializeApp({
        credential: adminLib.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized using FIREBASE_* per-field environment variables');
      return adminLib;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin from FIREBASE_* env vars:', err.message || err);
      // fall through to other methods
    }
  }

  // Try to use application default credentials (ADC).
  // This covers Cloud provider environments (Compute Engine, Cloud Run, etc.)
  // that provide credentials via the metadata server without needing to set
  // GOOGLE_APPLICATION_CREDENTIALS. NOTE: we intentionally do NOT fall back
  // to a local JSON file on disk to avoid pointing to the checked-in service
  // account file. The preferred approaches are:
  // - Provide `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the JSON),
  // - Provide per-field `FIREBASE_*` environment variables (handled above),
  // - Or rely on ADC provided by the platform.

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
