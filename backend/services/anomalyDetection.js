const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');
const Vote = require('../models/Vote');

const riskToSeverity = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

const hoursAgo = (hours) => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
};

const passwordFailedLogins = async () => {
  const since = hoursAgo(24);
  const logs = await AuditLog.find({
    action: 'failed_login',
    createdAt: { $gte: since },
  });

  const byUser = {};
  const byIp = {};

  for (const log of logs) {
    if (log.user) {
      const key = log.user.toString();
      byUser[key] = (byUser[key] || 0) + 1;
    }
    if (log.ipAddress) {
      byIp[log.ipAddress] = (byIp[log.ipAddress] || 0) + 1;
    }
  }

  const findings = [];

  for (const [userId, count] of Object.entries(byUser)) {
    if (count >= 3) {
      const score = clamp(30 + count * 10);
      findings.push({
        type: 'repeated_failed_login',
        userId,
        entity: `user:${userId}`,
        riskScore: clamp(score),
        reason: `Repeated failed login attempts (${count}) detected for this account in the last 24 hours.`,
        dataPoints: count,
      });
    }
  }

  for (const [ip, count] of Object.entries(byIp)) {
    if (count >= 5) {
      const score = clamp(40 + count * 8);
      findings.push({
        type: 'brute_force_pattern',
        entity: `ip:${ip}`,
        riskScore: clamp(score),
        reason: `Brute-force style login pattern detected: ${count} failed attempts from a single IP in the last 24 hours.`,
        dataPoints: count,
      });
    }
  }

  return findings;
};

const blockedAndRateLimited = async () => {
  const since = hoursAgo(24);
  const events = await SecurityEvent.find({
    event: { $in: ['rate_limit_exceeded', 'blocked_request', 'too_many_requests'] },
    createdAt: { $gte: since },
    status: { $ne: 'false_positive' },
  });

  const findings = [];
  for (const event of events) {
    findings.push({
      type: 'blocked_request',
      userId: event.user ? event.user.toString() : undefined,
      entity: event.user ? `user:${event.user.toString()}` : 'system',
      riskScore: clamp(Number(event.riskScore) || 85),
      reason: event.description || `Blocked/rate-limited request detected (${event.event}).`,
      dataPoints: 1,
    });
  }

  return findings;
};

const abnormalVoting = async () => {
  const since = hoursAgo(24);
  const votes = await Vote.find({ timestamp: { $gte: since } }).select('voter candidate timestamp');

  const byVoter = {};
  const byHour = {};

  for (const vote of votes) {
    const vId = vote.voter.toString();
    byVoter[vId] = (byVoter[vId] || 0) + 1;
    const hour = new Date(vote.timestamp).toISOString().slice(0, 13);
    byHour[hour] = (byHour[hour] || 0) + 1;
  }

  const findings = [];

  for (const [voterId, count] of Object.entries(byVoter)) {
    if (count >= 5) {
      const score = clamp(70);
      findings.push({
        type: 'abnormal_voting_activity',
        userId: voterId,
        entity: `voter:${voterId}`,
        riskScore: score,
        reason: `Abnormal voting activity: ${count} ballots recorded for a single voter in the last 24 hours.`,
        dataPoints: count,
      });
    }
  }

  const hourValues = Object.values(byHour);
  const peak = Math.max(...hourValues, 0);
  const total = hourValues.reduce((a, b) => a + b, 0);

  if (hourValues.length > 0 && peak > 0 && total / hourValues.length >= 25) {
    const score = clamp(55);
    findings.push({
      type: 'unusual_request_frequency',
      entity: 'system',
      riskScore: score,
      reason: `Unusual request frequency detected: ${total} votes recorded in ${hourValues.length} hours with a peak of ${peak} votes in a single hour.`,
      dataPoints: total,
    });
  }

  return findings;
};

const sessionPattern = async () => {
  const since = hoursAgo(48);
  const logs = await AuditLog.find({ action: 'login', createdAt: { $gte: since } });
  const byUser = {};
  const uniqIps = {};

  for (const log of logs) {
    if (!log.user) continue;
    const key = log.user.toString();
    byUser[key] = (byUser[key] || 0) + 1;
    if (!uniqIps[key]) uniqIps[key] = new Set();
    if (log.ipAddress) uniqIps[key].add(log.ipAddress);
  }

  const findings = [];
  for (const [userId, count] of Object.entries(byUser)) {
    const ips = uniqIps[userId] || new Set();
    if (count >= 8 && ips.size >= 3) {
      const score = clamp(65);
      findings.push({
        type: 'unusual_session_pattern',
        userId,
        entity: `user:${userId}`,
        riskScore: score,
        reason: `Unusual session pattern: ${count} logins across ${ips.size} different IP addresses in the last 48 hours.`,
        dataPoints: count,
      });
    }
  }

  return findings;
};

exports.analyzeAnomalies = async () => {
  const groups = await Promise.all([
    passwordFailedLogins(),
    blockedAndRateLimited(),
    abnormalVoting(),
    sessionPattern(),
  ]);

  const findings = groups.flat();

  findings.sort((a, b) => b.riskScore - a.riskScore);

  const recent = findings.slice(0, 20);

  const enriched = await Promise.all(
    recent.map(async (finding) => {
      let user = null;
      if (finding.userId) {
        try {
          const User = require('../models/User');
          user = await User.findById(finding.userId).select('name email role');
        } catch {
          // ignore user resolution failure
        }
      }
      return {
        ...finding,
        severity: riskToSeverity(finding.riskScore),
        status: finding.riskScore >= 70 ? 'new' : 'under_review',
        user,
      };
    })
  );

  const high = enriched.filter((f) => f.severity === 'high').length;
  const medium = enriched.filter((f) => f.severity === 'medium').length;
  const low = enriched.filter((f) => f.severity === 'low').length;

  return {
    analyzedAt: new Date().toISOString(),
    summary: {
      totalFindings: enriched.length,
      high,
      medium,
      low,
      overallRisk: clamp(enriched.reduce((a, f) => a + f.riskScore, 0) / (enriched.length || 1)),
      engine: 'rule-based anomaly detector (v1)',
    },
    anomalies: enriched,
  };
};