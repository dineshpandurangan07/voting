const express = require('express');
const router = express.Router();
const {
  getCandidates,
  getCandidate,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  approveCandidate,
  rejectCandidate,
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getCandidates)
  .post(protect, authorize('super_admin', 'election_officer'), addCandidate);

router
  .route('/:id')
  .get(protect, getCandidate)
  .put(protect, authorize('super_admin', 'election_officer'), updateCandidate)
  .delete(protect, authorize('super_admin', 'election_officer'), deleteCandidate);

router.put('/:id/approve', protect, authorize('super_admin', 'election_officer'), approveCandidate);
router.put('/:id/reject', protect, authorize('super_admin', 'election_officer'), rejectCandidate);

module.exports = router;