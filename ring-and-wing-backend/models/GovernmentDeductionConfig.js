const mongoose = require('mongoose');

/**
 * Government Deduction Configuration Schema
 * 
 * Stores Philippine government-mandated contribution rates for:
 * - SSS (Social Security System) - with EC (Employees' Compensation)
 * - PhilHealth (Philippine Health Insurance)
 * - Pag-IBIG (Home Development Mutual Fund)
 * 
 * Includes both EMPLOYEE and EMPLOYER shares for compliance.
 * 
 * Legal References:
 * - SSS: Circular No. 2023-033 (2024 Contribution Schedule)
 * - PhilHealth: Circular No. 2023-0008 (Premium Contribution)
 * - Pag-IBIG: Circular No. 395 (Contribution Table)
 */

const governmentDeductionConfigSchema = new mongoose.Schema({
  // VERSION CONTROL
  version: {
    type: Number,
    required: true,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernmentDeductionConfig'
  },

  // ============================================
  // SSS Configuration (2024 Rates)
  // Total: 15% (Employee 5% + Employer 10%) + EC
  // ============================================
  sss: {
    // Contribution Rates
    employeeRate: {
      type: Number,
      required: true,
      default: 0.05, // 5%
      min: 0,
      max: 1
    },
    employerRate: {
      type: Number,
      required: true,
      default: 0.10, // 10%
      min: 0,
      max: 1
    },
    totalRate: {
      type: Number,
      required: true,
      default: 0.15, // 15% total (before EC)
      min: 0,
      max: 1
    },
    
    // Monthly Salary Credit (MSC) - Basis for contribution
    mscFloor: {
      type: Number,
      required: true,
      default: 4000, // Minimum MSC ₱4,000
      min: 0
    },
    mscCeiling: {
      type: Number,
      required: true,
      default: 35000, // Maximum MSC ₱35,000 (2024)
      min: 0
    },
    
    // MSC Brackets for lookup
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
      },
      // Pre-computed contributions for quick lookup (optional)
      employeeContribution: {
        type: Number
      },
      employerContribution: {
        type: Number
      },
      ecContribution: {
        type: Number
      }
    }],
    
    // Employees' Compensation (EC) - Employer Only
    ec: {
      enabled: {
        type: Boolean,
        default: true
      },
      lowMscThreshold: {
        type: Number,
        default: 15000 // Below/equal = ₱10 EC
      },
      lowMscAmount: {
        type: Number,
        default: 10 // ₱10 for MSC ≤ ₱15,000
      },
      highMscAmount: {
        type: Number,
        default: 30 // ₱30 for MSC > ₱15,000
      }
    },
    
    description: {
      type: String,
      default: 'Social Security System - Employee and Employer contribution based on Monthly Salary Credit'
    },
    legalReference: {
      type: String,
      default: 'SSS Circular No. 2023-033'
    }
  },
  
  // ============================================
  // PhilHealth Configuration (2024 Rates)
  // Total: 5% (Employee 2.5% + Employer 2.5%)
  // ============================================
  philHealth: {
    // Contribution Rates
    employeeRate: {
      type: Number,
      required: true,
      default: 0.025, // 2.5%
      min: 0,
      max: 1
    },
    employerRate: {
      type: Number,
      required: true,
      default: 0.025, // 2.5%
      min: 0,
      max: 1
    },
    totalRate: {
      type: Number,
      required: true,
      default: 0.05, // 5% total
      min: 0,
      max: 1
    },
    
    // Monthly Basic Salary (MBS) - Basis for contribution
    // Legacy field names kept for backward compatibility
    floor: {
      type: Number,
      required: true,
      default: 10000, // Minimum MBS ₱10,000
      min: 0
    },
    ceiling: {
      type: Number,
      required: true,
      default: 100000, // Maximum MBS ₱100,000
      min: 0
    },
    
    description: {
      type: String,
      default: 'Philippine Health Insurance - Employee and Employer equal share contribution'
    },
    legalReference: {
      type: String,
      default: 'PhilHealth Circular No. 2023-0008'
    }
  },
  
  // ============================================
  // Pag-IBIG Configuration (2024 Rates)
  // Total: 4% (Employee 2% + Employer 2%)
  // ============================================
  pagIbig: {
    // Contribution Rates
    employeeRate: {
      type: Number,
      required: true,
      default: 0.02, // 2%
      min: 0,
      max: 1
    },
    employerRate: {
      type: Number,
      required: true,
      default: 0.02, // 2%
      min: 0,
      max: 1
    },
    totalRate: {
      type: Number,
      required: true,
      default: 0.04, // 4% total
      min: 0,
      max: 1
    },
    
    // Monthly Fund Salary (MFS) - Basis for contribution
    mfsCap: {
      type: Number,
      required: true,
      default: 10000, // MFS capped at ₱10,000
      min: 0
    },
    
    // Maximum Contributions
    maxContribution: {
      type: Number,
      required: true,
      default: 200, // Legacy: Employee max ₱200
      min: 0
    },
    maxEmployeeContribution: {
      type: Number,
      required: true,
      default: 200, // ₱200 max
      min: 0
    },
    maxEmployerContribution: {
      type: Number,
      required: true,
      default: 200, // ₱200 max
      min: 0
    },
    
    description: {
      type: String,
      default: 'Home Development Mutual Fund - Employee and Employer equal contribution with MFS cap'
    },
    legalReference: {
      type: String,
      default: 'Pag-IBIG Fund Circular No. 395'
    }
  },
  
  // ============================================
  // Withholding Tax Configuration (Future)
  // ============================================
  withholdingTax: {
    enabled: {
      type: Boolean,
      default: false
    },
    brackets: [{
      min: Number,
      max: Number,
      fixedAmount: Number,
      rate: Number
    }],
    description: {
      type: String,
      default: 'Withholding Tax based on BIR Tax Table'
    }
  },
  
  // ============================================
  // Metadata
  // ============================================
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  expirationDate: {
    type: Date // For scheduled rate changes
  },
  
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  
  isActive: {
    type: Boolean,
    default: false
  },
  
  isDraft: {
    type: Boolean,
    default: true // Draft until approved
  },
  
  // ============================================
  // Approval Workflow
  // ============================================
  approval: {
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'pending_approval', 'approved', 'rejected'],
      default: 'draft'
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNotes: {
      type: String
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    approvalNotes: {
      type: String
    }
  },
  
  // ============================================
  // Audit Trail
  // ============================================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  changeReason: {
    type: String // Required for updates
  },
  
  supportingDocuments: [{
    name: {
      type: String
    },
    url: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  notes: {
    type: String,
    default: ''
  },
  
  // Immutable change history
  changeHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String // 'created', 'updated', 'approved', 'activated', 'deactivated'
    },
    changes: {
      type: mongoose.Schema.Types.Mixed // Diff of changes
    },
    reason: {
      type: String
    }
  }],
  
  // ============================================
  // Scheduled Review
  // ============================================
  nextReviewDate: {
    type: Date
  },
  
  reviewReminder: {
    enabled: {
      type: Boolean,
      default: true
    },
    daysBeforeReview: {
      type: Number,
      default: 30
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

// Index for querying active configuration
governmentDeductionConfigSchema.index({ isActive: 1, year: -1 });
governmentDeductionConfigSchema.index({ 'approval.status': 1 });
governmentDeductionConfigSchema.index({ version: -1 });

// Virtual for total employer contribution including EC
governmentDeductionConfigSchema.virtual('sss.totalEmployerRate').get(function() {
  return this.sss.employerRate; // EC is fixed amount, not rate
});

// Pre-save middleware to record change history
governmentDeductionConfigSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    // Add to change history
    this.changeHistory.push({
      timestamp: new Date(),
      userId: this.updatedBy,
      action: 'updated',
      reason: this.changeReason || 'No reason provided'
    });
  }
  next();
});

// Static method to get current active configuration
governmentDeductionConfigSchema.statics.getActiveConfig = async function() {
  const config = await this.findOne({ isActive: true })
    .sort({ year: -1, createdAt: -1 })
    .lean();
  
  return config;
};

// Static method to get configuration by version
governmentDeductionConfigSchema.statics.getByVersion = async function(version) {
  return await this.findOne({ version }).lean();
};

// Static method to get all versions for rollback options
governmentDeductionConfigSchema.statics.getVersionHistory = async function(limit = 10) {
  return await this.find()
    .select('version year effectiveDate isActive approval.status createdAt createdBy notes')
    .sort({ version: -1 })
    .limit(limit)
    .populate('createdBy', 'username email')
    .lean();
};

// Static method to create new configuration with version tracking
governmentDeductionConfigSchema.statics.createNewConfig = async function(configData, userId) {
  // Get latest version
  const latestConfig = await this.findOne().sort({ version: -1 }).lean();
  const newVersion = latestConfig ? latestConfig.version + 1 : 1;
  
  // Create new config (as draft by default)
  const newConfig = await this.create({
    ...configData,
    version: newVersion,
    previousVersion: latestConfig?._id,
    createdBy: userId,
    isActive: false, // Don't auto-activate
    isDraft: true,
    approval: {
      status: 'draft'
    },
    changeHistory: [{
      timestamp: new Date(),
      userId: userId,
      action: 'created',
      reason: configData.changeReason || 'Initial creation'
    }]
  });
  
  return newConfig;
};

// Static method to activate a configuration (after approval)
governmentDeductionConfigSchema.statics.activateConfig = async function(configId, userId) {
  // Deactivate all other configs
  await this.updateMany(
    { _id: { $ne: configId } },
    { 
      isActive: false,
      $push: {
        changeHistory: {
          timestamp: new Date(),
          userId: userId,
          action: 'deactivated',
          reason: 'New configuration activated'
        }
      }
    }
  );
  
  // Activate the specified config
  const config = await this.findByIdAndUpdate(
    configId,
    {
      isActive: true,
      isDraft: false,
      'approval.status': 'approved',
      'approval.approvedBy': userId,
      'approval.approvedAt': new Date(),
      $push: {
        changeHistory: {
          timestamp: new Date(),
          userId: userId,
          action: 'activated',
          reason: 'Configuration approved and activated'
        }
      }
    },
    { new: true }
  );
  
  return config;
};

// Static method to rollback to previous version
governmentDeductionConfigSchema.statics.rollbackToVersion = async function(version, userId, reason) {
  const targetConfig = await this.findOne({ version });
  
  if (!targetConfig) {
    throw new Error(`Configuration version ${version} not found`);
  }
  
  // Deactivate current
  await this.updateMany(
    { isActive: true },
    { 
      isActive: false,
      $push: {
        changeHistory: {
          timestamp: new Date(),
          userId: userId,
          action: 'deactivated',
          reason: `Rollback to version ${version}: ${reason}`
        }
      }
    }
  );
  
  // Activate target version
  targetConfig.isActive = true;
  targetConfig.changeHistory.push({
    timestamp: new Date(),
    userId: userId,
    action: 'rollback_activated',
    reason: reason
  });
  
  await targetConfig.save();
  
  return targetConfig;
};

// Instance method to submit for approval
governmentDeductionConfigSchema.methods.submitForApproval = async function(userId) {
  this.approval.status = 'pending_review';
  this.approval.submittedBy = userId;
  this.approval.submittedAt = new Date();
  this.isDraft = false;
  
  this.changeHistory.push({
    timestamp: new Date(),
    userId: userId,
    action: 'submitted_for_approval',
    reason: 'Submitted for review'
  });
  
  return await this.save();
};

// Instance method to approve configuration
governmentDeductionConfigSchema.methods.approve = async function(userId, notes) {
  this.approval.status = 'approved';
  this.approval.approvedBy = userId;
  this.approval.approvedAt = new Date();
  this.approval.approvalNotes = notes;
  
  this.changeHistory.push({
    timestamp: new Date(),
    userId: userId,
    action: 'approved',
    reason: notes || 'Approved'
  });
  
  return await this.save();
};

module.exports = mongoose.model('GovernmentDeductionConfig', governmentDeductionConfigSchema);
