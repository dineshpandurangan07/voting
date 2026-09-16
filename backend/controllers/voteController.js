const crypto = require('crypto');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const createNotification = async (userId, title, message, type = 'general') => {
  try {
    const Notification = require('../models/Notification');
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error(`Could not create notification: ${error.message}`);
  }
};

const generateReceiptId = () => {
  return `VX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

exports.castVote = async (req, res, next) => {
  try {
    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      return res.status(400).json({
        success: false,
        message: 'electionId and candidateId are required',
      });
    }

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (election.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: `Voting is not open. Current election status: ${election.status}`,
      });
    }

    const now = new Date();
    if (now < new Date(election.startDate) || now > new Date(election.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Voting is outside the election time window',
      });
    }

    const voter = await User.findById(req.user._id);
    if (!voter || !voter.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Voting not permitted.',
      });
    }

    if (!voter.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your voter account is not verified. Voting not permitted.',
      });
    }

    if (election.eligibleVoters.length > 0 && !election.eligibleVoters.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not eligible to vote in this election',
      });
    }

    const existingVote = await Vote.findOne({
      election: electionId,
      voter: req.user._id,
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election',
      });
    }

    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    if (candidate.election.toString() !== electionId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Candidate does not belong to this election',
      });
    }

    if (candidate.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Candidate is not approved for voting',
      });
    }

    const receiptId = generateReceiptId();
    let vote;

    try {
      vote = await Vote.create({
        election: electionId,
        voter: req.user._id,
        candidate: candidateId,
        receiptId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already voted in this election',
        });
      }
      throw error;
    }

    candidate.votes += 1;
    await candidate.save();
    election.totalVotes += 1;
    await election.save();

    const receiptExpiration = new Date();
    receiptExpiration.setSeconds(receiptExpiration.getSeconds() + 60);

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'vote_cast',
      description: `${voter.name} cast a vote in election "${election.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionId, receiptId },
    });

    await createNotification(
      req.user._id,
      'Vote Confirmation',
      `Your vote in "${election.name}" has been recorded. Receipt ID: ${receiptId}. This receipt expires in 60 seconds.`,
      'vote_confirmation'
    );

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        receiptId,
        expiresIn: '60s',
        election: {
          id: election._id,
          name: election.name,
        },
        timestamp: vote.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getVoteHistory = async (req, res, next) => {
  try {
    const votes = await Vote.find({ voter: req.user._id })
      .populate('election', 'name electionType status startDate endDate')
      .populate('candidate', 'name party')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: votes.length,
      data: votes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVotesByElection = async (req, res, next) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (req.user.role === 'election_officer' && election.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view votes for elections you created',
      });
    }

    const votes = await Vote.find({ election: electionId })
      .populate('voter', 'name email isVerified')
      .populate('candidate', 'name party')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: votes.length,
      data: votes,
    });
  } catch (error) {
    next(error);
  }
};