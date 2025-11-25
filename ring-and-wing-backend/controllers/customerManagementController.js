/**
 * Customer Management Controller
 * Admin endpoints for managing customer accounts
 * 
 * Created: November 25, 2025
 */

const Customer = require('../models/Customer');
const CustomerActivityLog = require('../models/CustomerActivityLog');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get all customers with search, filters, and pagination
 * @route   GET /api/admin/customers
 * @access  Private (Admin only)
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      search = '',
      status = 'all', // 'all', 'active', 'inactive', 'deleted'
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'active') {
      query.isActive = true;
      query.deletedAt = null;
    } else if (status === 'inactive') {
      query.isActive = false;
      query.deletedAt = null;
    } else if (status === 'deleted') {
      query.deletedAt = { $ne: null };
    }

    // Count total documents
    const total = await Customer.countDocuments(query);

    // Get customers with pagination
    const customers = await Customer.find(query)
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
};

/**
 * @desc    Get single customer details
 * @route   GET /api/admin/customers/:id
 * @access  Private (Admin only)
 */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get recent activity logs
    const activityLogs = await CustomerActivityLog.find({ customerId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        activityLogs
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new customer (admin-created)
 * @route   POST /api/admin/customers
 * @access  Private (Admin only)
 */
exports.createCustomer = async (req, res) => {
  try {
    const { username, phone, email, password, firstName, lastName, isActive = true } = req.body;

    // Validate required fields
    if (!username || !phone || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check for existing customer
    const existingCustomer = await Customer.findOne({
      $or: [{ phone }, { username: username.toLowerCase() }]
    });

    if (existingCustomer) {
      const field = existingCustomer.username === username.toLowerCase() ? 'Username' : 'Phone number';
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
      lastName,
      isActive,
      isVerified: true // Admin-created accounts are verified
    });

    await customer.save();

    // Log activity
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'account_created_by_admin',
      details: { createdBy: req.user._id, createdByName: req.user.name || req.user.username },
      performedBy: req.user._id,
      performedByType: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        _id: customer._id,
        username: customer.username,
        phone: customer.phone,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

/**
 * @desc    Update customer details
 * @route   PUT /api/admin/customers/:id
 * @access  Private (Admin only)
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { username, phone, email, firstName, lastName } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const updates = {};
    const changes = [];

    // Validate and update username
    if (username && username !== customer.username) {
      const existingUser = await Customer.findOne({ 
        username: username.toLowerCase(), 
        _id: { $ne: customer._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      changes.push({ field: 'username', from: customer.username, to: username.toLowerCase() });
      updates.username = username.toLowerCase();
    }

    // Validate and update phone
    if (phone && phone !== customer.phone) {
      const existingPhone = await Customer.findOne({ phone, _id: { $ne: customer._id } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
      changes.push({ field: 'phone', from: customer.phone, to: phone });
      updates.phone = phone;
    }

    // Validate and update email
    if (email !== undefined && email !== customer.email) {
      if (email) {
        const existingEmail = await Customer.findOne({ email, _id: { $ne: customer._id } });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered'
          });
        }
      }
      changes.push({ field: 'email', from: customer.email, to: email || null });
      updates.email = email || null;
    }

    // Update names
    if (firstName && firstName !== customer.firstName) {
      changes.push({ field: 'firstName', from: customer.firstName, to: firstName });
      updates.firstName = firstName;
    }
    if (lastName && lastName !== customer.lastName) {
      changes.push({ field: 'lastName', from: customer.lastName, to: lastName });
      updates.lastName = lastName;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      Object.assign(customer, updates);
      await customer.save();

      // Log activity
      await CustomerActivityLog.create({
        customerId: customer._id,
        action: 'profile_updated_by_admin',
        details: { changes, updatedBy: req.user._id, updatedByName: req.user.name || req.user.username },
        performedBy: req.user._id,
        performedByType: 'admin'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: await Customer.findById(customer._id).select('-password')
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
};

/**
 * @desc    Reset customer password
 * @route   PUT /api/admin/customers/:id/reset-password
 * @access  Private (Admin only)
 */
exports.resetCustomerPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.password = newPassword;
    await customer.save();

    // Log activity
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'password_reset_by_admin',
      details: { resetBy: req.user._id, resetByName: req.user.name || req.user.username },
      performedBy: req.user._id,
      performedByType: 'admin'
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

/**
 * @desc    Toggle customer active status (activate/deactivate)
 * @route   PUT /api/admin/customers/:id/status
 * @access  Private (Admin only)
 */
exports.toggleCustomerStatus = async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const previousStatus = customer.isActive;
    customer.isActive = isActive;
    
    if (!isActive) {
      customer.deactivatedAt = new Date();
      customer.deactivationReason = reason || 'Deactivated by admin';
    } else {
      customer.deactivatedAt = null;
      customer.deactivationReason = null;
    }

    await customer.save();

    // Log activity
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: isActive ? 'account_activated' : 'account_deactivated',
      details: { 
        previousStatus, 
        newStatus: isActive,
        reason: reason || null,
        performedBy: req.user._id, 
        performedByName: req.user.name || req.user.username 
      },
      performedBy: req.user._id,
      performedByType: 'admin'
    });

    // Emit real-time event to force logout if deactivated
    const io = req.app.get('io');
    if (io && !isActive) {
      io.emit('customerAccountRestricted', {
        customerId: customer._id.toString(),
        action: 'deactivated',
        reason: reason || 'Account deactivated by admin',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: isActive ? 'Customer activated successfully' : 'Customer deactivated successfully',
      data: {
        _id: customer._id,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    console.error('Toggle customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer status',
      error: error.message
    });
  }
};

/**
 * @desc    Ban customer (permanent deactivation)
 * @route   PUT /api/admin/customers/:id/ban
 * @access  Private (Admin only)
 */
exports.banCustomer = async (req, res) => {
  try {
    const { reason } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.isActive = false;
    customer.isBanned = true;
    customer.bannedAt = new Date();
    customer.banReason = reason || 'Banned by admin';

    await customer.save();

    // Log activity
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'account_banned',
      details: { 
        reason: reason || 'Banned by admin',
        bannedBy: req.user._id, 
        bannedByName: req.user.name || req.user.username 
      },
      performedBy: req.user._id,
      performedByType: 'admin'
    });

    // Emit real-time event to force logout
    const io = req.app.get('io');
    if (io) {
      io.emit('customerAccountRestricted', {
        customerId: customer._id.toString(),
        action: 'banned',
        reason: reason || 'Account banned by admin',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Customer banned successfully',
      data: {
        _id: customer._id,
        isBanned: customer.isBanned
      }
    });
  } catch (error) {
    console.error('Ban customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error banning customer',
      error: error.message
    });
  }
};

/**
 * @desc    Unban customer
 * @route   PUT /api/admin/customers/:id/unban
 * @access  Private (Admin only)
 */
exports.unbanCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.isActive = true;
    customer.isBanned = false;
    customer.bannedAt = null;
    customer.banReason = null;

    await customer.save();

    // Log activity
    await CustomerActivityLog.create({
      customerId: customer._id,
      action: 'account_unbanned',
      details: { 
        unbannedBy: req.user._id, 
        unbannedByName: req.user.name || req.user.username 
      },
      performedBy: req.user._id,
      performedByType: 'admin'
    });

    res.json({
      success: true,
      message: 'Customer unbanned successfully',
      data: {
        _id: customer._id,
        isBanned: customer.isBanned,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    console.error('Unban customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unbanning customer',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer activity logs
 * @route   GET /api/admin/customers/:id/activity
 * @access  Private (Admin only)
 */
exports.getCustomerActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const logs = await CustomerActivityLog.find({ customerId: req.params.id })
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await CustomerActivityLog.countDocuments({ customerId: req.params.id });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer statistics summary
 * @route   GET /api/admin/customers/stats
 * @access  Private (Admin only)
 */
exports.getCustomerStats = async (req, res) => {
  try {
    const [totalCustomers, activeCustomers, inactiveCustomers, bannedCustomers, newThisMonth] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ isActive: true, deletedAt: null }),
      Customer.countDocuments({ isActive: false, deletedAt: null, isBanned: { $ne: true } }),
      Customer.countDocuments({ isBanned: true }),
      Customer.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    // Get top customers by total spent
    const topCustomers = await Customer.find({ totalSpent: { $gt: 0 } })
      .select('username firstName lastName totalOrders totalSpent')
      .sort({ totalSpent: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        bannedCustomers,
        newThisMonth,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer statistics',
      error: error.message
    });
  }
};
