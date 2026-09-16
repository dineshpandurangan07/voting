const SecurityEvent = require('../models/SecurityEvent');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { analyzeAnomalies } = require('../services/anomalyDetection');

exports.getSecurityOverview = async (req, res, next) => {
  try {
    const failedLogins = await AuditLog.countDocuments({ action: 'failed_login' });

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const suspiciousActivities = await SecurityEvent.countDocuments({
      severity: { $in: ['medium', 'high'] },
      createdAt: { $gte: last24Hours },
      status: { $ne: 'false_positive' },
    });

    const highRiskEvents = await SecurityEvent.countDocuments({
      severity: 'high',
      riskScore: { $gte: 70 },
    });

    const blockedRequests = await SecurityEvent.countDocuments({
      event: { $in: ['rate_limit_exceeded', 'blocked_request', 'too_many_requests'] },
    });

    const activeSessions = await Session.countDocuments({
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    const statusBreakdown = await SecurityEvent.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const severityBreakdown = await SecurityEvent.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        failedLogins,
        suspiciousActivities,
        highRiskEvents,
        blockedRequests,
        activeSessions,
        statusBreakdown,
        severityBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSecurityEvents = async (req, res, next) => {
  try {
    const { severity, status, event, from, to } = req.query;

    const filter = {};

    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (event) filter.event = event;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const events = await SecurityEvent.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnomalies = async (req, res, next) => {
  try {
    const report = await analyzeAnomalies();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSecurityEvent = async (req, res, next) => {
  try {
    const { status, action, riskScore } = req.body;

    let event = await SecurityEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Security event not found',
      });
    }

    if (status) {
      if (!['new', 'under_review', 'resolved', 'false_positive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }
      event.status = status;
    }

    if (action !== undefined) event.action = action;
    if (riskScore !== undefined) {
      if (riskScore < 0 || riskScore > 100) {
        return res.status(400).json({
          success: false,
          message: 'Risk score must be between 0 and 100',
        });
      }
      event.riskScore = riskScore;
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Security event updated successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};