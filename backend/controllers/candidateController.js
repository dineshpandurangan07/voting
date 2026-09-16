const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
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

exports.getCandidates = async (req, res, next) => {
  try {
    const { election, status, search } = req.query;

    const filter = {};

    if (election) {
      filter.election = election;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { party: { $regex: search, $options: 'i' } },
      ];
    }

    const candidates = await Candidate.find(filter)
      .populate('election', 'name electionType status')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('election', 'name electionType status')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

exports.addCandidate = async (req, res, next) => {
  try {
    const { name, party, bio, photo, election, status } = req.body;

    if (!name || !election) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name and election are required',
      });
    }

    const electionDoc = await Election.findById(election);

    if (!electionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    const candidate = await Candidate.create({
      name,
      party,
      bio,
      photo,
      election,
      addedBy: req.user._id,
      status: status || 'pending',
    });

    await Election.findByIdAndUpdate(
      election,
      { $addToSet: { candidates: candidate._id } },
      { new: true }
    );

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'candidate_added',
      description: `${req.user.name} added candidate "${candidate.name}" to election "${electionDoc.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { electionId: election, candidateId: candidate._id },
    });

    if (candidate.status === 'approved') {
      await createNotification(
        electionDoc.createdBy,
        'Candidate Added',
        `Candidate "${candidate.name}" was added to "${electionDoc.name}".`,
        'candidate_approval'
      );
    }

    res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCandidate = async (req, res, next) => {
  try {
    let candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    const { name, party, bio, photo } = req.body;

    if (name) candidate.name = name;
    if (party !== undefined) candidate.party = party;
    if (bio !== undefined) candidate.bio = bio;
    if (photo !== undefined) candidate.photo = photo;

    await candidate.save();

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    const candidateName = candidate.name;

    await Election.findByIdAndUpdate(candidate.election, {
      $pull: { candidates: candidate._id },
    });

    await candidate.deleteOne();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'candidate_deleted',
      description: `${req.user.name} deleted candidate "${candidateName}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { candidateName },
    });

    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.approveCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('election', 'name');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    candidate.status = 'approved';
    await candidate.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'candidate_approved',
      description: `${req.user.name} approved candidate "${candidate.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { candidateId: candidate._id },
    });

    if (candidate.addedBy) {
      await createNotification(
        candidate.addedBy,
        'Candidate Approved',
        `Your candidate "${candidate.name}" has been approved.`,
        'candidate_approval'
      );
    }

    res.status(200).json({
      success: true,
      message: 'Candidate approved successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('election', 'name');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    candidate.status = 'rejected';
    await candidate.save();

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'candidate_rejected',
      description: `${req.user.name} rejected candidate "${candidate.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      metadata: { candidateId: candidate._id },
    });

    if (candidate.addedBy) {
      await createNotification(
        candidate.addedBy,
        'Candidate Rejected',
        `Your candidate "${candidate.name}" was not approved.`,
        'candidate_approval'
      );
    }

    res.status(200).json({
      success: true,
      message: 'Candidate rejected successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};