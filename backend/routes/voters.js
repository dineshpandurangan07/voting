const express = require('express');
const router = express.Router();
const {
  getVoters,
  getVoter,
  verifyVoter,
  toggleActive,
  getVotingHistory,
} = require('../controllers/voterController');
const { protect, authorize } = require('../middleware/auth');

router.get(
  '/',
  protect,
  authorize('super_admin', 'election_officer'),
  getVoters
);

router.get(
  '/history/:id',
  protect,
  authorize('super_admin', 'election_officer'),
  getVotingHistory
);

router
  .route('/:id')
  .get(protect, authorize('super_admin', 'election_officer'), getVoter)
  .put(protect, authorize('super_admin', 'election_officer'), toggleActive);

router.put(
  '/:id/verify',
  protect,
  authorize('super_admin', 'election_officer'),
  verifyVoter
);

router.put(
  '/:id/toggle-active',
  protect,
  authorize('super_admin', 'election_officer'),
  toggleActive
);

module.exports = router;