const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { user, action, from, to, electionId } = req.query;

    const pageRaw = parseInt(req.query.page, 10);
    const limitRaw = parseInt(req.query.limit, 10);

    const pageNum = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limitNum = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;

    const filter = {};

    if (user) filter.user = user;

    if (electionId) {
      filter.$or = [
        { 'metadata.electionId': electionId },
        { 'metadata.electionName': { $regex: electionId, $options: 'i' } },
      ];
    }

    if (action) {
      const actions = action.split(',');
      filter.action = { $in: actions };
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};