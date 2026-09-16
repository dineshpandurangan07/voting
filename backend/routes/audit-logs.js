const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

router.get(
  '/',
  protect,
  authorize('super_admin', 'auditor'),
  getAuditLogs
);

module.exports = router;