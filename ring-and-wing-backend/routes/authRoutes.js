const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const { auth } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

router.post('/register', criticalCheck, registerUser);
router.post('/login', criticalCheck, loginUser);
router.post('/logout', auth, criticalCheck, logoutUser);

// Verify admin password endpoint
router.post('/verify-admin', criticalCheck, async (req, res) => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('[verify-admin] Request received');
    console.log('[verify-admin] Has password:', !!password);
    console.log('[verify-admin] Has token:', !!token);
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    let userToVerify;
    
    // If token is provided, verify against the logged-in user
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[verify-admin] Token decoded, user ID:', decoded.id);
        
        userToVerify = await User.findById(decoded.id).select('+password');
        
        if (!userToVerify) {
          console.log('[verify-admin] User not found by token ID, falling back to admin');
        } else {
          console.log('[verify-admin] Found user:', userToVerify.username, 'role:', userToVerify.role);
          
          // Check if user has admin/manager role
          if (userToVerify.role !== 'manager' && userToVerify.role !== 'admin') {
            return res.status(403).json({ message: 'Only managers/admins can override availability' });
          }
        }
      } catch (tokenError) {
        console.log('[verify-admin] Token verification failed:', tokenError.message);
      }
    }
    
    // If no valid token, verify against the default admin user
    if (!userToVerify) {
      console.log('[verify-admin] Looking for default admin user');
      userToVerify = await User.findOne({ username: 'admin' }).select('+password');
      
      if (!userToVerify) {
        // Try finding any manager user as fallback
        console.log('[verify-admin] Admin user not found, trying any manager');
        userToVerify = await User.findOne({ role: 'manager' }).select('+password');
        
        if (!userToVerify) {
          console.log('[verify-admin] No manager users found in database');
          return res.status(404).json({ message: 'No admin or manager user found. Please ensure at least one manager account exists.' });
        }
        console.log('[verify-admin] Found manager user:', userToVerify.username);
      } else {
        console.log('[verify-admin] Found admin user');
      }
    }
    
    // Compare password
    console.log('[verify-admin] Comparing password for user:', userToVerify.username);
    console.log('[verify-admin] User has password hash:', !!userToVerify.password);
    
    if (!userToVerify.password) {
      console.log('[verify-admin] User has no password set');
      return res.status(500).json({ 
        message: 'User account has no password set. Please reset the password.',
        error: 'No password hash found'
      });
    }
    
    const isMatch = await bcrypt.compare(password, userToVerify.password);
    
    if (!isMatch) {
      console.log('[verify-admin] Password mismatch');
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    console.log('[verify-admin] Password verified successfully');
    res.json({ 
      message: 'Password verified', 
      verified: true,
      username: userToVerify.username 
    });
  } catch (error) {
    console.error('[verify-admin] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;