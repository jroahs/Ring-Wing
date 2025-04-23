const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['staff', 'manager'],
      message: 'Invalid user role'
    },
    required: [true, 'User role is required'],
    default: 'staff'
  },
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(value) {
        if (this.role === 'staff') {
          const manager = await mongoose.model('User').findById(value);
          return manager?.role === 'manager';
        }
        return true;
      },
      message: 'Staff must report to a valid manager'
    },
    required: function() {
      return this.role === 'staff';
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// JWT generation method
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
      username: this.username
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: process.env.JWT_ISSUER || 'ring-wing-cafe'
    }
  );
};

// Virtual relationship
userSchema.virtual('subordinates', {
  ref: 'User',
  localField: '_id',
  foreignField: 'reportsTo',
  justOne: false
});

module.exports = mongoose.model('User', userSchema);