const express = require('express');
const router = express.Router();
const {
  getElections,
  getElection,
  createElection,
  updateElection,
  deleteElection,
  getElectionStats,
  releaseResults,
} = require('../controllers/electionController');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getElections)
  .post(protect, authorize('super_admin', 'election_officer'), createElection);

router.get('/stats', protect, getElectionStats);

router.post(
  '/:id/release-results',
  protect,
  authorize('super_admin', 'election_officer'),
  releaseResults
);

router
  .route('/:id')
  .get(protect, getElection)
  .put(protect, authorize('super_admin', 'election_officer'), updateElection)
  .delete(protect, authorize('super_admin', 'election_officer'), deleteElection);

module.exports = router;