const express = require('express');
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { auth, isManager } = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');
const { saveStaffProfileImage, deleteStaffProfileImage } = require('../utils/imageUtils');

const router = express.Router();

// Validation middleware for staff creation
const validateStaffCreation = (req, res, next) => {
  const { username, email, password } = req.body;

  // Username validation
  if (!username || !username.trim()) {
    return res.status(400).json({ message: 'Username is required' });
  }

  // Password validation
  if (!password || password.length < 8) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long' 
    });
  }

  // Email validation
  if (!email || !email.trim() || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  next();
};

// Public endpoint for time clock - returns limited staff information
router.get('/time-clock', async (req, res) => {
  try {
    // Only return active staff with limited fields for the time clock
    const staff = await Staff.find({ status: { $ne: 'inactive' } })
      .select('_id name position profilePicture pinCode')
      .lean();

    console.log('Fetched staff for time clock:', staff.length, 'records');
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff for time clock:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all staff members with optional filters - requires authentication
router.get('/', auth, async (req, res) => {
  try {    const { userId, status, populate } = req.query;
    let query = {};
    
    console.log('[Staff Debug] GET request received with auth:', req.user?.username);
    console.log('[Staff Debug] Query params:', req.query);
    
    if (userId) {
      query.userId = userId;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Start building the query
    let staffQuery = Staff.find(query)
      .populate('userId', 'username email role');
    
    // Add optional populations
    if (populate) {
      const fieldsToPopulate = populate.split(',');
      if (fieldsToPopulate.includes('payrollScheduleId')) {
        staffQuery = staffQuery.populate('payrollScheduleId');
      }
    }
    
    // Always populate payroll records
    staffQuery = staffQuery.populate('payrollRecords');
    
    const staff = await staffQuery.lean();

    console.log('Fetched staff (GET):', staff.length, 'records');
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching staff',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get staff by user ID
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[Staff Debug] Fetching staff by user ID:', userId);

    const staff = await Staff.findOne({ userId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff record not found'
      });
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('[Staff Error] Error fetching staff by user ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new staff member
router.post('/', auth, validateStaffCreation, async (req, res) => {
  try {
    console.log('Request payload (POST):', req.body); // Log the incoming request payload

    const { 
      username, 
      email, 
      password, 
      name, 
      position, 
      phone, 
      dailyRate, 
      profilePicture, 
      allowances,
      pinCode 
    } = req.body;

    // Check for existing username or email (case insensitive)
    const existingUser = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username.toLowerCase() === username.toLowerCase() 
          ? 'Username already exists' 
          : 'Email already exists' 
      });
    }

    // Find or create a default manager if reportsTo is not provided
    const user = new User({ 
      username: username.toLowerCase(), 
      email: email.toLowerCase(), 
      password,
      role: 'staff'
    });
    await user.save();    try {
      // Handle base64 profile picture if provided
      let processedProfilePicture = profilePicture;
      if (profilePicture && profilePicture.startsWith('data:image')) {
        processedProfilePicture = saveStaffProfileImage(profilePicture, user._id);
      }
      
      // Create the staff member and link to the user account
      const newStaff = new Staff({
        name,
        position,
        phone,
        dailyRate,
        profilePicture: processedProfilePicture,
        allowances: allowances || 0,
        userId: user._id,
        pinCode: pinCode || '0000' // Explicitly set the PIN code
      });
      
      console.log('Creating new staff with PIN code:', pinCode || '0000');
      
      const savedStaff = await newStaff.save();
      const populatedStaff = await Staff.findById(savedStaff._id)
        .populate('userId', 'username email role');

      console.log('Saved staff (POST):', savedStaff); // Log the saved staff member

      res.status(201).json(populatedStaff);
    } catch (staffError) {
      // Cleanup: Delete the user account if staff creation fails
      await User.findByIdAndDelete(user._id);
      throw staffError;
    }
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update staff member
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if the user has permission to update (either manager or updating their own record)
    const isOwnRecord = req.staff && req.params.id === req.staff._id.toString();
    const isManager = req.user.role === 'manager';
    
    // For payrollScheduleId updates, require manager role
    if (req.body.payrollScheduleId && !isManager) {
      return res.status(403).json({ 
        success: false,
        message: 'Manager permissions required to update payroll schedules' 
      });
    }
    
    // For other updates, either must be manager or updating own record
    if (!isManager && !isOwnRecord) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have permission to update this staff member' 
      });
    }
    
    // Check whether we're doing a staff-only or account-only update
    const { staffOnly, accountOnly } = req.body;
    // Extract user and staff data from request
    const { username, email, password, ...staffUpdates } = req.body;
    
    // Always remove these flags from the updates
    delete staffUpdates.staffOnly;
    delete staffUpdates.accountOnly;
    delete staffUpdates.userId;
    
    console.log(`Staff update for ID ${req.params.id}:`, {
      updateType: staffOnly ? 'Staff Only' : accountOnly ? 'Account Only' : 'Complete',
      receivedPinCode: req.body.pinCode,
      updatesObject: staffUpdates
    });

    // First, find the staff member to get the userId
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    let updatedUser = null;
    
    // Update the user information if not staff-only update
    if (!staffOnly && (username || email || password)) {
      const userUpdates = {};
      if (username) userUpdates.username = username.toLowerCase();
      if (email) userUpdates.email = email.toLowerCase();
      if (password) userUpdates.password = password;
      
      if (Object.keys(userUpdates).length > 0) {
        console.log(`Updating user information for user ID: ${staff.userId}`);
        
        // If updating username or email, check for duplicates
        if (username || email) {
          const query = { _id: { $ne: staff.userId } }; // Exclude current user
          
          if (username) {
            query.username = { $regex: new RegExp(`^${username}$`, 'i') };
          }
          
          if (email) {
            query.email = { $regex: new RegExp(`^${email}$`, 'i') };
          }
          
          const existingUser = await User.findOne(query);
          
          if (existingUser) {
            return res.status(400).json({ 
              message: username && existingUser.username.toLowerCase() === username.toLowerCase()
                ? 'Username already exists'
                : 'Email already exists'
            });
          }
        }
        
        // Update the user document
        updatedUser = await User.findByIdAndUpdate(
          staff.userId,
          userUpdates,
          { new: true, runValidators: true, select: '-password' }
        );

        console.log('Updated user information:', {
          username: updatedUser.username,
          email: updatedUser.email
        });
      }
    }    let updatedStaff = staff;
        // Update the staff information if not account-only update
    if (!accountOnly) {      // Handle profile picture update - if a new picture is provided, delete the old one
      if (staffUpdates.profilePicture) {
        // Check if it's a base64 image
        if (staffUpdates.profilePicture.startsWith('data:image')) {
          // Save the new base64 image
          const newProfilePicturePath = saveStaffProfileImage(staffUpdates.profilePicture, staff._id);
          
          // Delete the old image if it exists
          if (staff.profilePicture && 
              !staff.profilePicture.includes('placeholders') && 
              !staff.profilePicture.startsWith('data:')) {
            try {
              // Use the utility function to delete the old profile picture
              const deleted = deleteStaffProfileImage(staff.profilePicture);
              if (deleted) {
                console.log(`Successfully deleted old profile picture during update: ${staff.profilePicture}`);
              }
            } catch (fileError) {
              console.error('Error deleting old profile picture during update:', fileError);
              // Continue with update even if old file removal fails
            }
          }
          
          // Update the path to the new image
          staffUpdates.profilePicture = newProfilePicturePath;
        } else if (staff.profilePicture && 
                  staffUpdates.profilePicture !== staff.profilePicture &&
                  !staff.profilePicture.includes('placeholders') && 
                  !staff.profilePicture.startsWith('data:')) {
          // Handle regular file path changes (not base64)
          try {
            const deleted = deleteStaffProfileImage(staff.profilePicture);
            if (deleted) {
              console.log(`Successfully deleted old profile picture during path change: ${staff.profilePicture}`);
            }
          } catch (fileError) {
            console.error('Error deleting old profile picture during path change:', fileError);
            // Continue with update even if old file removal fails
          }
        }
      }
      
      updatedStaff = await Staff.findByIdAndUpdate(
        req.params.id,
        staffUpdates,
        { new: true, runValidators: true }
      ).populate('userId', 'username email role');
      
      console.log('Updated staff information:', {
        name: updatedStaff.name,
        position: updatedStaff.position,
        pinCode: updatedStaff.pinCode
      });
    } else if (!updatedStaff.populated('userId')) {
      // If only updating account, make sure userId is populated for response
      updatedStaff = await Staff.findById(req.params.id)
        .populate('userId', 'username email role');
    }

    // Combine staff and user data in the response for the frontend
    const result = updatedStaff.toObject();
    
    // Copy user properties to the root level for frontend compatibility
    if (result.userId) {
      result.username = updatedUser ? updatedUser.username : result.userId.username;
      result.email = updatedUser ? updatedUser.email : result.userId.email;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete staff member
router.delete('/:id', auth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }    // Delete profile picture if it exists
    if (staff.profilePicture && !staff.profilePicture.includes('placeholders')) {
      try {
        // Use the deleteStaffProfileImage utility function
        const deleted = deleteStaffProfileImage(staff.profilePicture);
        if (deleted) {
          console.log(`Deleted staff profile picture: ${staff.profilePicture}`);
        }
      } catch (fileError) {
        console.error('Error deleting profile picture:', fileError);
        // Continue with deletion even if file removal fails
      }
    }

    // Delete associated user account
    await User.findByIdAndDelete(staff.userId);
    
    // Delete staff record
    await Staff.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: error.message });
  }
});

// Authenticate staff by PIN code
router.post('/authenticate-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'PIN code is required'
      });
    }

    // Find staff member with matching PIN code
    const staff = await Staff.findOne({ pinCode: pin })
      .populate('userId', 'username email role');
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN code'
      });
    }
    
    return res.json({
      success: true,
      message: 'Authentication successful',
      staff
    });
  } catch (error) {
    console.error('PIN authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
});

module.exports = router;