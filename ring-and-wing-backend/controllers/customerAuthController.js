const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

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

    // Check if account is active
    if (!customer.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/phone or password'
      });
    }

    // Update last login
    customer.lastLogin = Date.now();
    await customer.save();

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
