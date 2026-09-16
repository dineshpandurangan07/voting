const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,15}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['super_admin', 'election_officer', 'auditor', 'voter'],
        message: 'Invalid role',
      },
      default: 'voter',
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    preferences: {
      emailNotif: { type: Boolean, default: true },
      electionAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      voteConfirmations: { type: Boolean, default: true },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAuthToken = function (sessionId) {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      sessionId: sessionId || undefined,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

userSchema.methods.getResetPasswordToken = function () {
  const token = require('crypto').randomBytes(20).toString('hex');

  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);

  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;