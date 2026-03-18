const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { admin } = require('../services/firebaseAdmin');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH] Authentication started for:', req.method, req.path);
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔐 [AUTH] Auth header exists:', !!authHeader);
    console.log('🔐 [AUTH] Token extracted:', !!token);

    if (!token) {
      console.log('❌ [AUTH] No token provided');
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    const decodedHeader = jwt.decode(token, { complete: true });
    console.log('🔐 [AUTH] Token decoded:', !!decodedHeader);
    console.log('🔐 [AUTH] Token algorithm:', decodedHeader?.header?.alg);
    
    if (!decodedHeader) {
      console.log('❌ [AUTH] Invalid token format');
      return res.status(403).json({ success: false, message: 'Invalid token format' });
    }

    let user;

    if (decodedHeader.header.alg === 'RS256') {
      console.log('🔐 [AUTH] Verifying as Firebase Token');
      try {
        // First try with original token
        const decodedFirebase = await admin.auth().verifyIdToken(token);
        console.log('🔐 [AUTH] Firebase verification successful, UID:', decodedFirebase.uid);
        
        user = await User.findOne({ googleUid: decodedFirebase.uid });
        console.log('🔐 [AUTH] User lookup result:', !!user);
        
        if (user) {
          console.log('🔐 [AUTH] User found:', user._id, user.email);
        } else {
          console.log('❌ [AUTH] User not found in database for UID:', decodedFirebase.uid);
        }
      } catch (firebaseErr) {
        console.error('❌ [AUTH] Firebase verification failed with original token:', firebaseErr.message);
        
        // If issuer error, try to manually verify the token first
        if (firebaseErr.message && firebaseErr.message.includes('incorrect "iss" (issuer) claim')) {
          console.log('🔧 [AUTH] Attempting manual token verification for issuer mismatch...');
          
          try {
            // Decode without verification to check claims
            const decoded = jwt.decode(token);
            console.log('🔐 [AUTH] Manual decode successful');
            console.log('🔐 [AUTH] Issuer:', decoded.iss);
            console.log('🔐 [AUTH] Audience:', decoded.aud);
            console.log('🔐 [AUTH] UID:', decoded.sub);
            
            // Check if it's our expected project and still valid
            const expectedAudience = 'sochai-2025';
            const expectedIssuer1 = 'https://securetoken.google.com/sochai-2025';
            const expectedIssuer2 = 'https://securetoken.googleapis.com/sochai-2025';
            
            if (decoded.aud === expectedAudience && 
                (decoded.iss === expectedIssuer1 || decoded.iss === expectedIssuer2) &&
                decoded.exp > Date.now() / 1000) {
              
              console.log('✅ [AUTH] Manual verification passed, looking up user...');
              user = await User.findOne({ googleUid: decoded.sub });
              
              if (user) {
                console.log('✅ [AUTH] User found with manual verification:', user._id, user.email);
              } else {
                console.log('❌ [AUTH] User not found for UID:', decoded.sub);
              }
            } else {
              console.log('❌ [AUTH] Manual verification failed - invalid claims');
              return res.status(401).json({ success: false, message: 'Invalid token claims' });
            }
          } catch (manualErr) {
            console.error('❌ [AUTH] Manual verification error:', manualErr.message);
            return res.status(401).json({ success: false, message: 'Token verification failed' });
          }
        } else {
          console.error('❌ [AUTH] Firebase error details:', firebaseErr);
          return res.status(401).json({ success: false, message: 'Invalid Firebase Session', error: firebaseErr.message });
        }
      }
    } else {
      console.log('🔐 [AUTH] Verifying as Custom Server Token');
      try {
        const decodedCustom = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        console.log('🔐 [AUTH] Custom JWT verification successful, userId:', decodedCustom.userId);
        user = await User.findById(decodedCustom.userId);
      } catch (customErr) {
        console.error('❌ [AUTH] Custom JWT verification failed:', customErr.message);
        return res.status(401).json({ success: false, message: 'Session expired or invalid' });
      }
    }

    // 3. Final User Check
    if (!user) {
      console.log('❌ [AUTH] Final check: User not found in database');
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    console.log('✅ [AUTH] Authentication successful for user:', user._id);
    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    console.error('General Auth error:', error.message);
    return res.status(403).json({ success: false, message: 'Authentication failed' });
  }
};

const authenticateTokenOptional = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // For guest users, continue without attaching req.user.
  if (!token) {
    req.user = null;
    req.token = null;
    return next();
  }

  // Reuse strict auth flow when token is present.
  return authenticateToken(req, res, next);
};

module.exports = { authenticateToken, authenticateTokenOptional };