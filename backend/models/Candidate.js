const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: [150, 'Candidate name cannot exceed 150 characters'],
    },
    party: {
      type: String,
      trim: true,
      maxlength: [150, 'Party name cannot exceed 150 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, 'Bio cannot exceed 2000 characters'],
    },
    photo: {
      type: String,
      default: '',
    },
    election: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: [true, 'Election reference is required'],
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Invalid candidate status',
      },
      default: 'pending',
    },
    votes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;