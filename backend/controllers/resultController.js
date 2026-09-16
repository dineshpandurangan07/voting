const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const User = require('../models/User');

exports.getResults = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    if (!election.resultsReleased && (election.status === 'ongoing' || election.status === 'scheduled')) {
      if (req.user.role === 'super_admin' || req.user.role === 'election_officer' || req.user.role === 'auditor') {
        // Authorized roles can preview ongoing results
      } else {
        return res.status(403).json({
          success: false,
          message: 'Results have not been released yet',
        });
      }
    }

    const candidates = await Candidate.find({ election: election._id, status: 'approved' }).sort({
      votes: -1,
    });

    const totalVotes = election.totalVotes || 0;

    const results = candidates.map((candidate) => {
      const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100) : 0;
      return {
        id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        photo: candidate.photo,
        votes: candidate.votes,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    const winner = results.length > 0 ? results[0] : null;

    const eligibleVoterCount =
      election.eligibleVoters.length > 0
        ? election.eligibleVoters.length
        : await User.countDocuments({ role: 'voter', isActive: true, isVerified: true });

    const participationRate =
      eligibleVoterCount > 0 ? Math.round((totalVotes / eligibleVoterCount) * 10000) / 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        election: {
          id: election._id,
          name: election.name,
          electionType: election.electionType,
          status: election.status,
          startDate: election.startDate,
          endDate: election.endDate,
          resultsReleased: election.resultsReleased,
        },
        totalVotes,
        eligibleVoters: eligibleVoterCount,
        participationRate,
        winner,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};