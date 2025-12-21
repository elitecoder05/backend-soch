const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {verifyFirebaseIdTokenManual} = require('./firebaseAuth')

const authenticateToken = async (req, res, next) => {
  try {
    // 1. Get the token from the header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }
  console.log("hii 1")
   const k = await verifyFirebaseIdTokenManual(token) 
   console.log(k)
   if(k.success){
     const user = await User.findOne({googleUid:k.data.user_id});
console.log("hii 2")
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 4. Attach the user to the request
    req.user = user;
    req.token=token;
    
    next();
   }
   else{
    // 2. Verify the Custom JWT (Corrected Step)
    // We use jwt.verify instead of admin.auth().verifyIdToken
    // This matches the jwt.sign() used in your routes/auth.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
console.log("hii 2")
    // 3. Find the user in MongoDB
    // The payload from your generateToken function is { userId: ... }
    const user = await User.findById(decoded.userId);
console.log("hii 2")
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 4. Attach the user to the request
    req.user = user;
    req.token=token;
    
    next();
  }

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authenticateToken };