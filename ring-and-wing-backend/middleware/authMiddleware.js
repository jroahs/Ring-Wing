const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication token is required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id }).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }    // For staff-related endpoints, also fetch the staff record
    const staff = await Staff.findOne({ userId: user._id });
    
    // Check if staff member is terminated/resigned and block access
    if (staff && ['Terminated', 'Resigned', 'Suspended'].includes(staff.status)) {
      return res.status(403).json({ 
        success: false,
        message: staff.status === 'Terminated' 
          ? 'Access denied: Your employment has been terminated'
          : staff.status === 'Resigned'
          ? 'Access denied: You have resigned from your position'
          : 'Access denied: Your account is suspended',
        terminationStatus: staff.status,
        terminationDate: staff.terminationInfo?.terminationDate
      });
    }
    
    // Set both user and staff info in request
    req.user = user;
    req.staff = staff; // This will be null for non-staff users
    req.token = token;

    console.log('[Auth Debug] Authentication successful:', {
      userId: user._id,
      role: user.role,
      hasStaffRecord: !!staff,
      staffStatus: staff?.status
    });

    next();
  } catch (error) {
    console.error('[Auth Debug] Authentication error:', error);
    const message = error.name === 'TokenExpiredError' 
      ? 'Session expired, please login again' 
      : error.name === 'JsonWebTokenError'
      ? 'Invalid authentication token'
      : 'Authentication failed';
      
    res.status(401).json({ 
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Role-based middleware
const isManager = (req, res, next) => {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ 
      success: false,  
      message: 'Manager privileges required' 
    });
  }
  next();
};

// Staff verification middleware
const isStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'staff' || !req.staff) {
    return res.status(403).json({ 
      success: false,
      message: 'Staff account required' 
    });
  }
  
  // Double-check staff status for staff-specific actions
  if (['Terminated', 'Resigned', 'Suspended'].includes(req.staff.status)) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied: Staff account is no longer active',
      terminationStatus: req.staff.status
    });
  }
  
  next();
};

module.exports = {
  auth,
  isManager,
  isStaff
};