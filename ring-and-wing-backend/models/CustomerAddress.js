const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  // Address type
  label: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  
  // Recipient information
  recipientName: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true
  },
  recipientPhone: {
    type: String,
    required: [true, 'Recipient phone is required'],
    trim: true
  },
  
  // Address details
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  barangay: {
    type: String,
    required: [true, 'Barangay is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    default: 'Manila'
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true,
    default: 'Metro Manila'
  },
  postalCode: {
    type: String,
    trim: true
  },
  
  // Additional notes
  landmark: String,
  deliveryNotes: String,
  
  // Status
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date
});

// Indexes
customerAddressSchema.index({ customerId: 1, isDefault: 1 });
customerAddressSchema.index({ customerId: 1, isActive: 1 });

// Ensure only one default address per customer
customerAddressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { customerId: this.customerId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('CustomerAddress', customerAddressSchema);
