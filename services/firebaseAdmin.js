// /*
// Backend Firebase Admin initialization.
// */

// const fs = require('fs');
// const path = require('path');
// const adminLib = require('firebase-admin');

// function initFirebaseAdmin() {
//   if (adminLib.apps && adminLib.apps.length > 0) {
//     // Already initialized
//     return adminLib;
//   }

//   const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;

//   if (serviceAccountBase64) {
//     try {
//       const jsonStr = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
//       const serviceAccount = JSON.parse(jsonStr);

//       adminLib.initializeApp({
//         credential: adminLib.credential.cert(serviceAccount),
//         storageBucket: process.env.FIREBASE_STORAGE_BUCKET // <--- ADDED THIS
//       });

//       console.log('Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_BASE64');
//       return adminLib;
//     } catch (err) {
//       console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err);
//       throw err;
//     }
//   }

//   // Support for per-field environment variables.
//   const hasPerField = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
//   if (hasPerField) {
//     const serviceAccount = {
//       type: process.env.FIREBASE_TYPE || 'service_account',
//       project_id: process.env.FIREBASE_PROJECT_ID,
//       private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//       private_key: process.env.FIREBASE_PRIVATE_KEY
//         ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
//         : undefined,
//       client_email: process.env.FIREBASE_CLIENT_EMAIL,
//       client_id: process.env.FIREBASE_CLIENT_ID,
//       auth_uri: process.env.FIREBASE_AUTH_URI,
//       token_uri: process.env.FIREBASE_TOKEN_URI,
//       auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
//       client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
//       universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
//     };

//     try {
//       adminLib.initializeApp({
//         credential: adminLib.credential.cert(serviceAccount),
//         storageBucket: process.env.FIREBASE_STORAGE_BUCKET // <--- ADDED THIS
//       });
//       console.log('Firebase Admin initialized using FIREBASE_* per-field environment variables');
//       return adminLib;
//     } catch (err) {
//       console.error('Failed to initialize Firebase Admin from FIREBASE_* env vars:', err.message || err);
//     }
//   }

//   try {
//     adminLib.initializeApp({
//       credential: adminLib.credential.applicationDefault(),
//       storageBucket: process.env.FIREBASE_STORAGE_BUCKET // <--- ADDED THIS
//     });
//     console.log('Firebase Admin initialized using applicationDefault()');
//     return adminLib;
//   } catch (err) {
//     console.error('Failed to initialize with applicationDefault():', err.message);
//   }

//   console.warn('Firebase Admin not initialized: No service account credentials found.');
//   return null;
// }

// let admin = null;
// try {
//   admin = initFirebaseAdmin();
// } catch (error) {
//   console.error('Firebase Admin initialization failed:', error.message);
//   admin = null;
// }

// module.exports = { admin, initFirebaseAdmin };
/*
Backend Firebase Admin initialization.
*/

const adminLib = require('firebase-admin');

function initFirebaseAdmin() {
  if (adminLib.apps && adminLib.apps.length > 0) {
    return adminLib;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountBase64) {
    try {
      const jsonStr = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(jsonStr);

      adminLib.initializeApp({
        credential: adminLib.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_BASE64');
      return adminLib;
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err);
      throw err;
    }
  }

  // Support for per-field environment variables
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
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('Firebase Admin initialized using FIREBASE_* per-field environment variables');
      return adminLib;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin from FIREBASE_* env vars:', err.message || err);
    }
  }

  try {
    adminLib.initializeApp({
      credential: adminLib.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log('Firebase Admin initialized using applicationDefault()');
    return adminLib;
  } catch (err) {
    console.error('Failed to initialize with applicationDefault():', err.message);
  }

  return null;
}

let admin = null;
try {
  admin = initFirebaseAdmin();
} catch (error) {
  console.error('Firebase Admin initialization failed:', error.message);
}

// Initialize Firestore
const db = admin ? admin.firestore() : null;

module.exports = { admin, db, initFirebaseAdmin };