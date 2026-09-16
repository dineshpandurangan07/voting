const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      enum: {
        values: [
          'login',
          'logout',
          'election_created',
          'election_updated',
          'election_deleted',
          'election_closed',
          'results_released',
          'candidate_added',
          'candidate_updated',
          'candidate_deleted',
          'candidate_approved',
          'candidate_rejected',
          'voter_verified',
          'vote_cast',
          'failed_login',
          'session_revoked',
          'logout_all',
          'password_changed',
          'password_reset',
          'profile_updated',
          'preferences_updated',
          'notification_deleted',
          'security_alert',
          'admin_action',
        ],
        message: 'Invalid audit action',
      },
      required: [true, 'Action is required'],
    },
    description: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;