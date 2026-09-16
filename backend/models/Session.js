const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    token: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.pre('validate', function (next) {
  if (!this.token) {
    this.token = this._id ? this._id.toString() : crypto.randomUUID();
  }
  next();
});

sessionSchema.index({ user: 1, createdAt: -1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;