const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SocketService = require('../services/socketService');

const registerUser = async (req, res) => {
  try {
    const { username, email, password, role, position, reportsTo } = req.body;

    // Check existing user with case-insensitive search
    let user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    if (user) {
      return res.status(400).json({ 
        message: `A user with this ${user.email === email.toLowerCase() ? 'email' : 'username'} already exists` 
      });
    }

    // Validate role-based requirements
    if (role === 'staff') {
      if (!reportsTo) {
        return res.status(400).json({ message: 'Staff must report to a manager' });
      }
      
      const manager = await User.findById(reportsTo);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ message: 'Invalid manager specified' });
      }
    }    // Set default position based on role if not provided
    let userPosition = position || 'cashier';
    if (role === 'manager' && !position) {
      userPosition = 'general_manager';
    }

    // Validate position
    const validPositions = ['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin'];
    if (!validPositions.includes(userPosition)) {
      return res.status(400).json({ message: 'Invalid position specified' });
    }

    // Create new user
    user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || 'staff',
      position: userPosition,
      reportsTo: role === 'staff' ? reportsTo : null
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();
      res.status(201).json({
      token,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      position: user.position,
      reportsTo: user.reportsTo
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      message: err.code === 11000 
        ? 'This username or email is already taken'
        : 'Server error - Please try again later'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both username and password' 
      });
    }

    // Find user with case-insensitive search and explicitly include password
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('+password').lean();

    if (!user || !user.password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials',
        auth: false
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials',
        auth: false 
      });
    }

    // Don't send password in response
    delete user.password;

    // Generate JWT token using model method
    const userDoc = await User.findById(user._id);
    const token = userDoc.generateAuthToken();

    // Set httpOnly cookie with the token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });    // Send response
    res.json({
      success: true,
      auth: true,
      token,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      position: user.position,
      reportsTo: user.reportsTo
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error - Please try again later',
      auth: false
    });
  }
};

// Add a logout endpoint
const logoutUser = async (req, res) => {
  try {
    // Emit socket event to logout all tabs for this user
    const io = req.app.get('io');
    if (io && req.user && req.user.id) {
      SocketService.emitUserLogout(io, req.user.id, 'manual');
      console.log(`[AuthController] Emitted logout event for user ${req.user.id}`);
    }
    
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error - Please try again later' });
  }
};

module.exports = { registerUser, loginUser, logoutUser };