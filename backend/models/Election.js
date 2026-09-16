const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Election name is required'],
      trim: true,
      maxlength: [200, 'Election name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    electionType: {
      type: String,
      enum: {
        values: ['student', 'organization', 'committee', 'general', 'custom'],
        message: 'Invalid election type',
      },
      default: 'general',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'ongoing', 'ended', 'paused', 'draft'],
        message: 'Invalid election status',
      },
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    eligibleVoters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    candidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
      },
    ],
    totalVotes: {
      type: Number,
      default: 0,
    },
    resultsReleased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;