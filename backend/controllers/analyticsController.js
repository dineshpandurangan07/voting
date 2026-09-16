const Election = require('../models/Election');
const User = require('../models/User');
const Vote = require('../models/Vote');
const Candidate = require('../models/Candidate');

exports.getAnalytics = async (req, res, next) => {
  try {
    const totalElections = await Election.countDocuments();
    const totalVoters = await User.countDocuments({ role: 'voter' });
    const verifiedVoters = await User.countDocuments({ role: 'voter', isVerified: true });
    const totalVotesCast = await Vote.countDocuments();
    const ongoingElections = await Election.countDocuments({ status: 'ongoing' });
    const endedElections = await Election.countDocuments({ status: 'ended' });
    const scheduledElections = await Election.countDocuments({ status: 'scheduled' });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const votesPerDay = await Vote.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    const votesPerDayFormatted = votesPerDay.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      count: item.count,
    }));

    const candidatePerformance = await Candidate.aggregate([
      {
        $group: {
          _id: '$election',
          totalCandidates: { $sum: 1 },
          approvedCandidates: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          totalVotes: { $sum: '$votes' },
        },
      },
      {
        $sort: { totalVotes: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const populatedPerformance = await Promise.all(
      candidatePerformance.map(async (item) => {
        const election = await Election.findById(item._id).select('name status');
        return {
          election: election ? { id: election._id, name: election.name, status: election.status } : item._id,
          totalCandidates: item.totalCandidates,
          approvedCandidates: item.approvedCandidates,
          totalVotes: item.totalVotes,
        };
      })
    );

    const participationRate =
      totalVoters > 0 ? Math.round((totalVotesCast / totalVoters) * 10000) / 100 : 0;
    const verificationRate =
      totalVoters > 0 ? Math.round((verifiedVoters / totalVoters) * 10000) / 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalElections,
          totalVoters,
          verifiedVoters,
          totalVotesCast,
          ongoingElections,
          endedElections,
          scheduledElections,
          participationRate,
          verificationRate,
        },
        votesPerDay: votesPerDayFormatted,
        candidatePerformance: populatedPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};