const CustomerAddress = require('../models/CustomerAddress');
const Customer = require('../models/Customer');

// @desc    Get all addresses for current customer
// @route   GET /api/customer/addresses
// @access  Private (Customer)
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await CustomerAddress.find({
      customerId: req.customer._id,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      count: addresses.length,
      addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses',
      error: error.message
    });
  }
};

// @desc    Create new address
// @route   POST /api/customer/addresses
// @access  Private (Customer)
exports.createAddress = async (req, res) => {
  try {
    const {
      label,
      recipientName,
      recipientPhone,
      street,
      barangay,
      city,
      province,
      postalCode,
      landmark,
      deliveryNotes,
      isDefault
    } = req.body;

    // Validate required fields
    if (!recipientName || !recipientPhone || !street || !barangay) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: recipientName, recipientPhone, street, barangay'
      });
    }

    // Create address
    const address = new CustomerAddress({
      customerId: req.customer._id,
      label: label || 'home',
      recipientName,
      recipientPhone,
      street,
      barangay,
      city: city || 'Manila',
      province: province || 'Metro Manila',
      postalCode,
      landmark,
      deliveryNotes,
      isDefault: isDefault || false
    });

    await address.save();

    // If this is set as default, update customer's defaultAddressId
    if (address.isDefault) {
      await Customer.findByIdAndUpdate(req.customer._id, {
        defaultAddressId: address._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating address',
      error: error.message
    });
  }
};

// @desc    Update address
// @route   PUT /api/customer/addresses/:id
// @access  Private (Customer)
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    // Find address and verify ownership
    const address = await CustomerAddress.findOne({
      _id: id,
      customerId: req.customer._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update fields
    const allowedFields = [
      'label',
      'recipientName',
      'recipientPhone',
      'street',
      'barangay',
      'city',
      'province',
      'postalCode',
      'landmark',
      'deliveryNotes',
      'isDefault'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        address[field] = req.body[field];
      }
    });

    await address.save();

    // If set as default, update customer's defaultAddressId
    if (address.isDefault) {
      await Customer.findByIdAndUpdate(req.customer._id, {
        defaultAddressId: address._id
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      address
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
};

// @desc    Delete address
// @route   DELETE /api/customer/addresses/:id
// @access  Private (Customer)
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    // Find address and verify ownership
    const address = await CustomerAddress.findOne({
      _id: id,
      customerId: req.customer._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Soft delete (mark as inactive)
    address.isActive = false;
    await address.save();

    // If this was the default address, clear customer's defaultAddressId
    if (address.isDefault) {
      await Customer.findByIdAndUpdate(req.customer._id, {
        defaultAddressId: null
      });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address',
      error: error.message
    });
  }
};

// @desc    Set address as default
// @route   PUT /api/customer/addresses/:id/set-default
// @access  Private (Customer)
exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;

    // Find address and verify ownership
    const address = await CustomerAddress.findOne({
      _id: id,
      customerId: req.customer._id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Set as default (pre-save hook will unset others)
    address.isDefault = true;
    await address.save();

    // Update customer's defaultAddressId
    await Customer.findByIdAndUpdate(req.customer._id, {
      defaultAddressId: address._id
    });

    res.json({
      success: true,
      message: 'Default address updated successfully',
      address
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default address',
      error: error.message
    });
  }
};
