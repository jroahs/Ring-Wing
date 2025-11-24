const mongoose = require('mongoose');

const governmentDeductionConfigSchema = new mongoose.Schema({
  // SSS Configuration
  sss: {
    employeeRate: {
      type: Number,
      required: true,
      default: 0.05, // 5%
      min: 0,
      max: 1
    },
    mscBrackets: [{
      min: {
        type: Number,
        required: true
      },
      max: {
        type: Number,
        required: true
      },
      msc: {
        type: Number,
        required: true
      }
    }],
    description: {
      type: String,
      default: 'Social Security System - Employee contribution based on Monthly Salary Credit'
    }
  },
  
  // PhilHealth Configuration
  philHealth: {
    employeeRate: {
      type: Number,
      required: true,
      default: 0.025, // 2.5%
      min: 0,
      max: 1
    },
    floor: {
      type: Number,
      required: true,
      default: 10000,
      min: 0
    },
    ceiling: {
      type: Number,
      required: true,
      default: 100000,
      min: 0
    },
    description: {
      type: String,
      default: 'Philippine Health Insurance - Employee contribution with floor and ceiling'
    }
  },
  
  // Pag-IBIG Configuration
  pagIbig: {
    employeeRate: {
      type: Number,
      required: true,
      default: 0.02, // 2%
      min: 0,
      max: 1
    },
    maxContribution: {
      type: Number,
      required: true,
      default: 200,
      min: 0
    },
    description: {
      type: String,
      default: 'Home Development Mutual Fund - Employee contribution with maximum cap'
    }
  },
  
  // Metadata
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for querying active configuration
governmentDeductionConfigSchema.index({ isActive: 1, year: -1 });

// Static method to get current active configuration
governmentDeductionConfigSchema.statics.getActiveConfig = async function() {
  const config = await this.findOne({ isActive: true })
    .sort({ year: -1, createdAt: -1 })
    .lean();
  
  return config;
};

// Static method to create new configuration
governmentDeductionConfigSchema.statics.createNewConfig = async function(configData, userId) {
  // Deactivate previous configs
  await this.updateMany({ isActive: true }, { isActive: false });
  
  // Create new config
  const newConfig = await this.create({
    ...configData,
    createdBy: userId,
    isActive: true
  });
  
  return newConfig;
};

module.exports = mongoose.model('GovernmentDeductionConfig', governmentDeductionConfigSchema);
