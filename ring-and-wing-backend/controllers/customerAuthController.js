const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const CustomerActivityLog = require('../models/CustomerActivityLog');

// Generate JWT token
const generateToken = (customer) => {
  return jwt.sign(
    {
      _id: customer._id,
      username: customer.username,
      phone: customer.phone,
      type: 'customer' // Important: distinguish from staff tokens
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '30d' }
  );
};

// @desc    Register new customer
// @route   POST /api/customer/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, phone, email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!username || !phone || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, phone, password, firstName, lastName'
      });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 20 characters'
      });
    }

    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain lowercase letters, numbers, and underscores'
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ 
      $or: [{ phone }, { username: username.toLowerCase() }] 
    });
    if (existingCustomer) {
      const field = existingCustomer.username === username ? 'Username' : 'Phone number';
      return res.status(400).json({
        success: false,
        message: `${field} already registered`
      });
    }

    // Check email if provided
    if (email) {
      const existingEmail = await Customer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Create customer
    const customer = new Customer({
      username: username.toLowerCase(),
      phone,
      email,
      password,
      firstName,
      lastName
    });

    await customer.save();
    
    // Log account creation
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'account_created',
      details: {
        ipAddress: req.ip,
        method: 'self_registration'
      }
    });

    // Generate token
    const token = generateToken(customer);

    // Return customer data (password is excluded by schema)
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: {
        _id: customer._id,
        username: customer.username,
        phone: customer.phone,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        createdAt: customer.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer account',
      error: error.message
    });
  }
};

// @desc    Login customer
// @route   POST /api/customer/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or phone

    // Validate required fields
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/phone and password'
      });
    }

    // Find customer by username or phone and include password for comparison
    const customer = await Customer.findOne({
      $or: [{ username: identifier.toLowerCase() }, { phone: identifier }]
    }).select('+password');
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/phone or password'
      });
    }

    // Check if account is banned
    if (customer.isBanned) {
      // Log failed login attempt (banned)
      await CustomerActivityLog.create({
        customerId: customer._id,
        action: 'login_failed',
        details: {
          reason: 'Account banned',
          ipAddress: req.ip
        }
      });
      
      return res.status(403).json({
        success: false,
        message: 'Account has been banned. Please contact support.',
        action: 'banned',
        reason: customer.banReason || 'Account banned'
      });
    }

    // Check if account is active
    if (!customer.isActive) {
      // Log failed login attempt (deactivated)
      await CustomerActivityLog.create({
        customerId: customer._id,
        action: 'login_failed',
        details: {
          reason: 'Account inactive',
          ipAddress: req.ip
        }
      });
      
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
        action: 'deactivated',
        reason: customer.deactivationReason || 'Account deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await CustomerActivityLog.create({
        customerId: customer._id,
        action: 'login_failed',
        details: {
          reason: 'Invalid password',
          ipAddress: req.ip
        }
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid username/phone or password'
      });
    }

    // Update last login
    customer.lastLogin = Date.now();
    await customer.save();
    
    // Log successful login
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'login',
      details: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Generate token
    const token = generateToken(customer);

    // Return customer data
    res.json({
      success: true,
      message: 'Login successful',
      customer: {
        _id: customer._id,
        username: customer.username,
        phone: customer.phone,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        defaultAddressId: customer.defaultAddressId,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastLogin: customer.lastLogin
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current customer profile
// @route   GET /api/customer/auth/me
// @access  Private (Customer)
exports.getMe = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer: {
        _id: customer._id,
        username: customer.username,
        phone: customer.phone,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        defaultAddressId: customer.defaultAddressId,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        isVerified: customer.isVerified,
        createdAt: customer.createdAt,
        lastLogin: customer.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Logout customer
// @route   POST /api/customer/auth/logout
// @access  Private (Customer)
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // We can add token blacklisting here if needed in the future
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

// @desc    Get customer profile
// @route   GET /api/customer/auth/profile
// @access  Private (Customer)
exports.getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).select('-password');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Update customer profile
// @route   PUT /api/customer/auth/profile
// @access  Private (Customer)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, phone, firstName, lastName } = req.body;
    const customer = await Customer.findById(req.customer._id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate username if being changed
    if (username && username !== customer.username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 20 characters'
        });
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username can only contain lowercase letters, numbers, and underscores'
        });
      }

      // Check if new username is already taken
      const existingUser = await Customer.findOne({ username, _id: { $ne: customer._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }

      customer.username = username;
    }

    // Validate email if being changed
    if (email && email !== customer.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Check if new email is already taken
      const existingEmail = await Customer.findOne({ email, _id: { $ne: customer._id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      customer.email = email;
    }

    // Validate phone if being changed
    if (phone && phone !== customer.phone) {
      const phoneRegex = /^(09|\+639)\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid Philippine phone number'
        });
      }

      // Check if new phone is already taken
      const existingPhone = await Customer.findOne({ phone, _id: { $ne: customer._id } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      customer.phone = phone;
    }

    // Update names
    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;

    await customer.save();

    const updatedCustomer = await Customer.findById(customer._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Change customer password
// @route   PUT /api/customer/auth/password
// @access  Private (Customer)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Must select +password since it's excluded by default
    const customer = await Customer.findById(req.customer._id).select('+password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify current password
    const isMatch = await customer.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    customer.password = newPassword;
    await customer.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// @desc    Delete customer account
// @route   DELETE /api/customer/auth/account
// @access  Private (Customer)
exports.deleteAccount = async (req, res) => {
  try {
    const { password, confirmText } = req.body;

    if (!password || confirmText !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation text "DELETE" required'
      });
    }

    const customer = await Customer.findById(req.customer._id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify password
    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Soft delete: mark as inactive instead of removing
    customer.isActive = false;
    customer.deletedAt = new Date();
    await customer.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};
