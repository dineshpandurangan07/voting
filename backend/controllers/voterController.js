const User = require('../models/User');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');

exports.getVoters = async (req, res, next) => {
  try {
    const { search, verified, active } = req.query;

    const filter = { role: 'voter' };

    if (verified !== undefined) {
      filter.isVerified = verified === 'true';
    }

    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const voters = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: voters.length,
      data: voters,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVoter = async (req, res, next) => {
  try {
    const voter = await User.findById(req.params.id).select('-password');

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
      });
    }

    if (voter.role !== 'voter') {
      return res.status(400).json({
        success: false,
        message: 'User is not registered as a voter',
      });
    }

    res.status(200).json({
      success: true,
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyVoter = async (req, res, next) => {
  try {
    const voter = await User.findById(req.params.id).select('-password');

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
      });
    }

    if (voter.role !== 'voter') {
      return res.status(400).json({
        success: false,
        message: 'User is not registered as a voter',
      });
    }

    voter.isVerified = true;
    await voter.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'voter_verified',
      description: `${req.user.name} verified voter "${voter.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { voterId: voter._id },
    });

    const Notification = require('../models/Notification');
    await Notification.create({
      user: voter._id,
      title: 'Account Verified',
      message: 'Congratulations! Your voter account has been verified.',
      type: 'account_verification',
    });

    res.status(200).json({
      success: true,
      message: 'Voter verified successfully',
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const voter = await User.findById(req.params.id).select('-password');

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
      });
    }

    if (voter.role !== 'voter') {
      return res.status(400).json({
        success: false,
        message: 'User is not registered as a voter',
      });
    }

    voter.isActive = !voter.isActive;
    await voter.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'admin_action',
      description: `${req.user.name} ${voter.isActive ? 'activated' : 'deactivated'} voter "${voter.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { voterId: voter._id, isActive: voter.isActive },
    });

    const Notification = require('../models/Notification');
    await Notification.create({
      user: voter._id,
      title: voter.isActive ? 'Account Activated' : 'Account Deactivated',
      message: voter.isActive
        ? 'Your voter account has been activated.'
        : 'Your voter account has been deactivated. Contact an administrator.',
      type: 'account_verification',
    });

    res.status(200).json({
      success: true,
      message: `Voter ${voter.isActive ? 'activated' : 'deactivated'} successfully`,
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVotingHistory = async (req, res, next) => {
  try {
    const voter = await User.findById(req.params.id);

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
      });
    }

    const votes = await Vote.find({ voter: voter._id })
      .populate('election', 'name electionType status startDate endDate')
      .populate('candidate', 'name party')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: votes.length,
      data: {
        voter: {
          id: voter._id,
          name: voter.name,
          email: voter.email,
        },
        votes,
      },
    });
  } catch (error) {
    next(error);
  }
};