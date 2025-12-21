const { admin } = require('../services/firebaseAdmin');

// Middleware to verify Firebase ID tokens (client-side JWTs from Firebase Auth)
// Usage: add to routes that should accept Firebase tokens for authentication.

const verifyFirebaseIdToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const matches = authHeader.match(/^Bearer (.*)$/);
    const idToken = matches ? matches[1] : null;

    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Firebase ID token missing' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (err) {
    console.error('Firebase auth verifyIdToken error:', err);
    return res.status(401).json({ success: false, message: 'Invalid Firebase ID token' });
  }
};

const verifyFirebaseIdTokenManual = async (token) => {
  try {
    
    const idToken = token

    if (!idToken) {
      return {success:false,data:null}
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {success:true,data:decodedToken}
   
  } catch (err) {
    console.error('Firebase auth verifyIdToken error:', err);
    return {success:false,data:null}
  }
};

module.exports = { verifyFirebaseIdToken,verifyFirebaseIdTokenManual };
