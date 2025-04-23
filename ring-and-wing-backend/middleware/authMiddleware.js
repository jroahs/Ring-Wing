const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
    }).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const message = error.name === 'TokenExpiredError' 
      ? 'Session expired, please login again' 
      : 'Authentication failed';
    res.status(401).json({ message });
  }
};

// Role-based middleware
const isManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ 
      message: 'Manager privileges required' 
    });
  }
  next();
};

// Optional: Staff verification middleware
const isStaff = (req, res, next) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ 
      message: 'Staff account required' 
    });
  }
  next();
};

// Optional: Admin verification (if you add admin role later)
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Administrator privileges required' 
    });
  }
  next();
};

module.exports = {
  auth,
  isManager,
  isStaff,
  isAdmin
};