const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
  try {
    const { username, email, password, role, reportsTo } = req.body;

    // Check existing user
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
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
    }

    // Create new user
    user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || 'staff',
      reportsTo: role === 'staff' ? reportsTo : null
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();
    
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        reportsTo: user.reportsTo
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    // Find user with password field explicitly selected
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('+password');

    if (!user) {
      console.log('No user found for:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.username);
    console.log('Password comparison for:', password.substring(0, 2) + '***');
    
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for:', user.username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = user.generateAuthToken();
    console.log('Token generated for:', user.username);

    res.json({
      token,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      reportsTo: user.reportsTo
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser };