const mongoose = require('mongoose');
const crypto = require('crypto');

const voteSchema = new mongoose.Schema(
  {
    election: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: [true, 'Election reference is required'],
    },
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Voter reference is required'],
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate reference is required'],
    },
    receiptId: {
      type: String,
      unique: true,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

voteSchema.index({ election: 1, voter: 1 }, { unique: true });

voteSchema.pre('validate', function (next) {
  if (!this.receiptId) {
    this.receiptId = `VX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;