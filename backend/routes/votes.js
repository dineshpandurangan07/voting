const express = require('express');
const router = express.Router();
const {
  castVote,
  getVoteHistory,
  getVotesByElection,
} = require('../controllers/voteController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('voter'), castVote);
router.get('/history', protect, getVoteHistory);
router.get('/election/:electionId', protect, authorize('super_admin', 'election_officer', 'auditor'), getVotesByElection);

module.exports = router;