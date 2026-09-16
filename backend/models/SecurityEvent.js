const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    event: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    severity: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Invalid severity level',
      },
      default: 'low',
    },
    riskScore: {
      type: Number,
      min: [0, 'Risk score cannot be below 0'],
      max: [100, 'Risk score cannot exceed 100'],
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['new', 'under_review', 'resolved', 'false_positive'],
        message: 'Invalid event status',
      },
      default: 'new',
    },
    action: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ severity: 1, status: 1 });

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

module.exports = SecurityEvent;