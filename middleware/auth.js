const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { admin } = require('../services/firebaseAdmin');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    const decodedHeader = jwt.decode(token, { complete: true });
    
    if (!decodedHeader) {
      return res.status(403).json({ success: false, message: 'Invalid token format' });
    }

    let user;

    if (decodedHeader.header.alg === 'RS256') {
      console.log("[Auth] Verifying as Firebase Token");
      try {
        const decodedFirebase = await admin.auth().verifyIdToken(token);
        user = await User.findOne({ googleUid: decodedFirebase.uid });
      } catch (firebaseErr) {
        console.error("Firebase Verification Failed:", firebaseErr.message);
        return res.status(401).json({ success: false, message: 'Invalid Firebase Session' });
      }
    } else {
      console.log("[Auth] Verifying as Custom Server Token");
      try {
        const decodedCustom = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        user = await User.findById(decodedCustom.userId);
      } catch (customErr) {
        console.error("Custom JWT Verification Failed:", customErr.message);
        return res.status(401).json({ success: false, message: 'Session expired or invalid' });
      }
    }

    // 3. Final User Check
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    console.error('General Auth error:', error.message);
    return res.status(403).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = { authenticateToken };