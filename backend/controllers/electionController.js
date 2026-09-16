const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const createNotification = async (userId, title, message, type = 'general') => {
  try {
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

exports.getElections = async (req, res, next) => {
  try {
    const { status, from, to, electionType } = req.query;

    const filter = {};

    if (req.user.role === 'voter') {
      filter.$or = [{ eligibleVoters: { $size: 0 } }, { eligibleVoters: req.user._id }];
    }

    if (status) {
      filter.status = status;
    }

    if (electionType) {
      filter.electionType = electionType;
    }

    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }

    const elections = await Election.find(filter)
      .populate('createdBy', 'name email role')
      .populate('candidates', 'name party status votes')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: elections.length,
      data: elections,
    });
  } catch (error) {
    next(error);
  }
};

exports.getElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('eligibleVoters', 'name email isVerified')
      .populate({
        path: 'candidates',
        populate: {
          path: 'addedBy',
          select: 'name email',
        },
      });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    res.status(200).json({
      success: true,
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

exports.createElection = async (req, res, next) => {
  try {
    const { name, description, electionType, startDate, endDate, status, eligibleVoters } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, startDate and endDate are required',
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    const election = await Election.create({
      name,
      description,
      electionType,
      startDate,
      endDate,
      status: status || 'draft',
      createdBy: req.user._id,
      eligibleVoters: eligibleVoters || [],
    });

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'election_created',
      description: `${req.user.name} created election "${election.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionId: election._id },
    });

    const voters = (eligibleVoters || []).filter((id) => id);
    for (const voterId of voters) {
      await createNotification(
        voterId,
        'New Election Created',
        `A new election "${election.name}" has been created.`,
        'election_created'
      );
    }

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateElection = async (req, res, next) => {
  try {
    let election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (
      req.user.role === 'election_officer' &&
      election.createdBy &&
      election.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit elections you created',
      });
    }

    const allowedFields = ['name', 'description', 'electionType', 'startDate', 'endDate', 'status', 'eligibleVoters'];
    const fieldsToUpdate = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        fieldsToUpdate[key] = req.body[key];
      }
    }

    if (req.body.resultsReleased !== undefined && req.user.role === 'super_admin') {
      fieldsToUpdate.resultsReleased = req.body.resultsReleased;
    }

    if (fieldsToUpdate.startDate && fieldsToUpdate.endDate) {
      if (new Date(fieldsToUpdate.endDate) <= new Date(fieldsToUpdate.startDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }
    } else if (fieldsToUpdate.endDate && new Date(fieldsToUpdate.endDate) <= new Date(election.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    election = await Election.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'election_updated',
      description: `${req.user.name} updated election "${election.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionId: election._id },
    });

    res.status(200).json({
      success: true,
      message: 'Election updated successfully',
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

exports.releaseResults = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (
      req.user.role === 'election_officer' &&
      election.createdBy &&
      election.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only release results for elections you created',
      });
    }

    if (election.resultsReleased) {
      return res.status(400).json({
        success: false,
        message: 'Results for this election have already been released',
      });
    }

    election.resultsReleased = true;
    await election.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'results_released',
      description: `${req.user.name} released results for election "${election.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionId: election._id },
    });

    res.status(200).json({
      success: true,
      message: 'Results released successfully',
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (
      req.user.role === 'election_officer' &&
      election.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete elections you created',
      });
    }

    const electionName = election.name;

    await Candidate.deleteMany({ election: election._id });
    await election.deleteOne();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'election_deleted',
      description: `${req.user.name} deleted election "${electionName}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionName },
    });

    res.status(200).json({
      success: true,
      message: 'Election deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getElectionStats = async (req, res, next) => {
  try {
    const now = new Date();

    await Election.updateMany(
      {
        status: { $in: ['scheduled', 'paused'] },
        startDate: { $lte: now },
        endDate: { $gte: now },
      },
      { status: 'ongoing' }
    );
    await Election.updateMany(
      { endDate: { $lt: now }, status: { $in: ['ongoing', 'scheduled', 'paused'] } },
      { status: 'ended' }
    );

    const total = await Election.countDocuments();
    const ongoing = await Election.countDocuments({ status: 'ongoing' });
    const upcoming = await Election.countDocuments({
      status: { $in: ['scheduled', 'draft'] },
      startDate: { $gt: now },
    });
    const ended = await Election.countDocuments({ status: 'ended' });

    res.status(200).json({
      success: true,
      data: {
        total,
        ongoing,
        upcoming,
        ended,
      },
    });
  } catch (error) {
    next(error);
  }
};