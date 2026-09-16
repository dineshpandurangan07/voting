const express = require('express');
const router = express.Router();
const {
  getSecurityOverview,
  getSecurityEvents,
  getAnomalies,
  updateSecurityEvent,
} = require('../controllers/securityController');
const { protect, authorize } = require('../middleware/auth');

router.get(
  '/anomalies',
  protect,
  authorize('super_admin', 'auditor', 'election_officer'),
  getAnomalies
);

router.get(
  '/overview',
  protect,
  authorize('super_admin', 'auditor', 'election_officer'),
  getSecurityOverview
);

router.get(
  '/events',
  protect,
  authorize('super_admin', 'auditor', 'election_officer'),
  getSecurityEvents
);

router.put(
  '/events/:id',
  protect,
  authorize('super_admin', 'auditor', 'election_officer'),
  updateSecurityEvent
);

module.exports = router;