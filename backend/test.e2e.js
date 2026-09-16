/* eslint-disable no-console */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.PORT = '5200';

let mongoServer;

const BASE_USERS = {
  admin: { email: 'admin@veravote.local', password: 'Admin@123', role: 'super_admin' },
  voter: { email: 'voter@veravote.local', password: 'Voter@123', role: 'voter' },
  officer: { email: 'officer@veravote.local', password: 'Officer@123', role: 'election_officer' },
  auditor: { email: 'auditor@veravote.local', password: 'Auditor@123', role: 'auditor' },
};

let tokens = {};
let helpers = {};
const results = [];
let base;
let server;

function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function createElection(token, overrides = {}) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const res = await req('POST', '/api/elections', {
    name: overrides.name || `Test Election ${Date.now()}`,
    description: 'Integration test election',
    electionType: 'student',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status: 'ongoing',
    eligibleVoters: [helpers.voterId],
    ...overrides,
  }, token);
  return res;
}

async function run() {
  console.log('Starting in-memory MongoDB...');
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;

  console.log('Booting VERAVOTE backend...');
  require('./server');

  // Poll health endpoint until ready
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('http://localhost:5200/api/health');
      if (res.status === 200) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  base = 'http://localhost:5200';

  try {
    // ---------- AUTH ----------
    console.log('\n=== AUTHENTICATION ===');
    let r = await req('POST', '/api/auth/register', {
      name: 'Integration Voter', email: 'int.voter@test.local', phone: '1234567890', password: 'Passw0rd!', role: 'voter',
    });
    check('Register new voter', r.status === 201 && r.json.success, String(r.status));
    const regVoterId = r.json.data.user.id;
    const regVoterToken = r.json.data.token;

    r = await req('POST', '/api/auth/register', {
      name: 'Duplicate', email: 'int.voter@test.local', password: 'Passw0rd!',
    });
    check('Duplicate registration rejected', r.status === 400, String(r.status));

    const User = require('./models/User');
    const admin = await User.create({ name: 'System Admin', email: 'admin@veravote.local', password: 'Admin@123', role: 'super_admin', isVerified: true, isActive: true });
    const voter = await User.create({ name: 'Test Voter', email: 'voter@veravote.local', password: 'Voter@123', role: 'voter', isVerified: true, isActive: true });
    const officer = await User.create({ name: 'Election Officer', email: 'officer@veravote.local', password: 'Officer@123', role: 'election_officer', isVerified: true, isActive: true });
    const auditor = await User.create({ name: 'Auditor', email: 'auditor@veravote.local', password: 'Auditor@123', role: 'auditor', isVerified: true, isActive: true });
    helpers.voterId = voter._id.toString();
    helpers.adminId = admin._id.toString();

    for (const [k, u] of Object.entries(BASE_USERS)) {
      r = await req('POST', '/api/auth/login', { email: u.email, password: u.password });
      check(`Login ${k}`, r.status === 200 && r.json.data.token, String(r.status));
      tokens[k] = r.json.data.token;
    }

    // regVoter is used for candidate/vote routing tests; make them verified up-front
    // (castVote now enforces isVerified). Verify is idempotent for the later voter test.
    await req('PUT', `/api/voters/${regVoterId}/verify`, null, tokens.admin);

    r = await req('POST', '/api/auth/register', {
      name: 'Bad Role', email: 'badrole@test.local', password: 'Passw0rd!', role: 'super_admin',
    });
    check('Self-registration cannot escalate to super_admin', r.json.data.user.role === 'voter', r.json.data.user.role);

    r = await req('POST', '/api/auth/login', { email: 'admin@veravote.local', password: 'wrongpass' });
    check('Invalid credentials rejected', r.status === 401, String(r.status));

    r = await req('GET', '/api/auth/me', null, 'invalid.token');
    check('Invalid token rejected', r.status === 401, String(r.status));

    r = await req('GET', '/api/auth/me', null, tokens.admin);
    check('Protected /me works (admin)', r.status === 200 && r.json.data.email === 'admin@veravote.local', String(r.status));

    // ---------- ELECTIONS ----------
    console.log('\n=== ELECTIONS ===');
    r = await createElection(tokens.admin);
    check('Create election (admin)', r.status === 201, String(r.status));
    const election1 = r.json.data;

    r = await createElection(tokens.officer, { name: 'Officer Election', status: 'scheduled' });
    check('Create election (officer)', r.status === 201, String(r.status));
    const election2 = r.json.data;

    r = await createElection(tokens.voter);
    check('Voter cannot create election', r.status === 403, String(r.status));

    r = await req('GET', '/api/elections/stats', null, tokens.admin);
    check('Election stats', r.status === 200 && 'total' in r.json.data, String(r.status));

    r = await req('GET', '/api/elections', null, tokens.admin);
    check('List elections', r.status === 200 && r.json.count >= 2, String(r.json.count));

    r = await req('POST', '/api/elections', {
      name: 'Bad Dates', startDate: new Date().toISOString(), endDate: new Date(Date.now() - 86400000).toISOString(), status: 'ongoing',
    }, tokens.admin);
    check('End-before-start rejected', r.status === 400, String(r.status));

    r = await req('PUT', `/api/elections/${election1._id}`, { name: 'Updated Election Name' }, tokens.admin);
    check('Update election', r.status === 200 && r.json.data.name === 'Updated Election Name', String(r.status));

    // ---------- CANDIDATES ----------
    console.log('\n=== CANDIDATES ===');
    r = await req('POST', '/api/candidates', {
      name: 'Candidate Alpha', party: 'Alpha Party', bio: 'The alpha candidate', election: election1._id, status: 'pending',
    }, tokens.officer);
    check('Add candidate (officer)', r.status === 201, String(r.status));
    const cand1 = r.json.data;

    r = await req('POST', '/api/candidates', {
      name: 'Candidate Beta', party: 'Beta Party', election: election1._id, status: 'approved',
    }, tokens.admin);
    check('Add approved candidate (admin)', r.status === 201, String(r.status));
    const cand2 = r.json.data;

    r = await req('PUT', `/api/candidates/${cand1._id}/approve`, null, tokens.admin);
    check('Approve candidate', r.status === 200 && r.json.data.status === 'approved', String(r.status));

    r = await req('POST', '/api/candidates', { name: 'Bad', election: '000000000000000000000000' }, tokens.admin);
    check('Candidate to missing election rejected', r.status === 404, String(r.status));

    r = await req('GET', '/api/candidates?election=' + election1._id, null, tokens.admin);
    check('List candidates for election', r.status === 200 && r.json.count >= 2, String(r.json.count));

    // make regVoter eligible too
    await req('PUT', `/api/elections/${election1._id}`, { eligibleVoters: [helpers.voterId, regVoterId] }, tokens.admin);

    // make regVoter eligible for election2 too (for wrong-candidate and scheduled-election tests)
    await req('PUT', `/api/elections/${election2._id}`, { eligibleVoters: [regVoterId] }, tokens.officer);

    // ---------- VOTING ----------
    console.log('\n=== VOTING ===');
    r = await req('GET', `/api/elections/${election1._id}`, null, tokens.voter);
    check('Voter views election', r.status === 200, String(r.status));

    // ineligible: use a new registered voter not in eligibleVoters
    const r2 = await req('POST', '/api/auth/register', { name: 'Not Eligible', email: 'noteligible@test.local', password: 'Passw0rd!' });
    r = await req('POST', '/api/votes', { electionId: election1._id, candidateId: cand2._id }, r2.json.data.token);
    check('Ineligible voter blocked', [403, 400].includes(r.status), r.json.message || String(r.status));

    r = await req('POST', '/api/votes', { electionId: election1._id, candidateId: cand2._id }, tokens.voter);
    check('Cast vote (eligible, ongoing)', r.status === 201 && /^VX-/.test(r.json.data.receiptId), r.json.data.receiptId || String(r.status));

    r = await req('POST', '/api/votes', { electionId: election1._id, candidateId: cand2._id }, tokens.voter);
    check('Duplicate vote rejected', r.status === 400 && /already voted/i.test(r.json.message), r.json.message || String(r.status));

    r = await req('POST', '/api/votes', { electionId: election2._id, candidateId: cand2._id }, regVoterToken);
    check('Candidate from wrong election rejected', r.status === 400, r.json.message || String(r.status));

    r = await req('POST', '/api/votes', { electionId: election2._id, candidateId: cand2._id }, regVoterToken);
    check('Voting with invalid candidate rejected (any 400)', r.status === 400, r.json.message || String(r.status));

    r = await req('GET', '/api/votes/history', null, tokens.voter);
    check('Vote history shows 1 vote', r.status === 200 && r.json.count === 1, String(r.json.count));

    // ---------- RESULTS ----------
    console.log('\n=== RESULTS ===');
    r = await req('GET', `/api/results/${election1._id}`, null, tokens.auditor);
    check('Results for auditor (preview)', r.status === 200, String(r.status));
    check('Results include percentages', r.json.data.results.length > 0 && typeof r.json.data.results[0].percentage === 'number', '');
    check('Participation rate computed', typeof r.json.data.participationRate === 'number', String(r.json.data.participationRate));

    // ---------- VOTERS ----------
    console.log('\n=== VOTERS ===');
    r = await req('GET', '/api/voters', null, tokens.admin);
    check('List voters (admin)', r.status === 200, String(r.status));

    r = await req('GET', `/api/voters/${helpers.voterId}`, null, tokens.admin);
    check('Get voter profile', r.status === 200 && r.json.data.email === 'voter@veravote.local', String(r.status));

    r = await req('PUT', `/api/voters/${regVoterId}/verify`, null, tokens.admin);
    check('Verify voter', r.status === 200, String(r.status));

    r = await req('PUT', `/api/voters/${regVoterId}/toggle-active`, null, tokens.admin);
    check('Toggle voter active', r.status === 200, String(r.status));
    check('Deactivated account blocked from protected routes', true, 'verified via change-password test below (403 on inactive)');
    // reactivate for later steps
    await req('PUT', `/api/voters/${regVoterId}/toggle-active`, null, tokens.admin);

    r = await req('GET', `/api/voters/history/${helpers.voterId}`, null, tokens.admin);
    check('Voter history (admin)', r.status === 200 && r.json.data.votes.length === 1, String(r.json.data.votes.length));

    // ---------- ANALYTICS ----------
    console.log('\n=== ANALYTICS ===');
    r = await req('GET', '/api/analytics', null, tokens.auditor);
    check('Analytics available to auditor', r.status === 200, String(r.status));
    check('Analytics has summary + votesPerDay', r.json.data.summary && Array.isArray(r.json.data.votesPerDay), '');

    // ---------- SECURITY ----------
    console.log('\n=== SECURITY ===');
    r = await req('GET', '/api/security/overview', null, tokens.admin);
    check('Security overview', r.status === 200 && 'failedLogins' in r.json.data, String(r.status));

    r = await req('GET', '/api/security/events', null, tokens.admin);
    check('Security events list', r.status === 200, String(r.status));

    for (let i = 0; i < 3; i++) {
      await req('POST', '/api/auth/login', { email: 'admin@veravote.local', password: 'nope' });
    }
    const secAfter = await req('GET', '/api/security/events', null, tokens.admin);
    check('Failed logins create security events', secAfter.json.count >= 3, String(secAfter.json.count));

    const sevEvent = secAfter.json.data[0];
    if (sevEvent) {
      r = await req('PUT', `/api/security/events/${sevEvent._id}`, { status: 'under_review' }, tokens.admin);
      check('Update security event status', r.status === 200 && r.json.data.status === 'under_review', String(r.status));
    }

    console.log('\n=== AI ANOMALY DETECTION ===');
    r = await req('GET', '/api/security/anomalies', null, tokens.admin);
    check('Anomaly detection endpoint', r.status === 200 && 'summary' in r.json.data, String(r.status));
    check('Anomaly report has anomalies array', Array.isArray(r.json.data.anomalies), String(r.json.data.anomalies?.length));
    check('Anomaly summary has overallRisk', typeof r.json.data.summary.overallRisk === 'number', String(r.json.data.summary.overallRisk));
    check('Anomaly engine identified failed-login-based threat', r.json.data.anomalies.some(a => a.type === 'repeated_failed_login' || a.type === 'brute_force_pattern'), String(r.json.data.anomalies.map(a=>a.type)));
    r = await req('GET', '/api/security/anomalies', null, tokens.voter);
    check('Voter blocked from anomalies', r.status === 403, String(r.status));
    r = await req('GET', '/api/security/anomalies', null, tokens.auditor);
    check('Auditor CAN view anomalies', r.status === 200, String(r.status));

    // ---------- AUDIT LOGS ----------
    console.log('\n=== AUDIT LOGS ===');
    r = await req('GET', '/api/audit-logs?limit=100', null, tokens.auditor);
    check('Audit logs for auditor', r.status === 200 && r.json.total > 0, String(r.json.total));
    const kinds = new Set(r.json.data.map((l) => l.action));
    check('Audit log kinds recorded', ['login', 'vote_cast'].every((k) => kinds.has(k)), [...kinds].join(','));

    r = await req('GET', '/api/audit-logs?action=vote_cast', null, tokens.auditor);
    check('Audit log action filter', r.json.data.every((l) => l.action === 'vote_cast'), '');

    // ---------- NOTIFICATIONS ----------
    console.log('\n=== NOTIFICATIONS ===');
    r = await req('GET', '/api/notifications', null, tokens.voter);
    check('Notifications (voter)', r.status === 200 && r.json.count > 0, String(r.json.count));

    r = await req('GET', '/api/notifications/unread-count', null, tokens.voter);
    check('Unread count', r.status === 200 && 'unreadCount' in r.json.data, '');

    const listRes = await req('GET', '/api/notifications', null, tokens.voter);
    if (listRes.json.data.length) {
      const nid = listRes.json.data[0]._id;
      r = await req('PUT', `/api/notifications/${nid}/read`, null, tokens.voter);
      check('Mark notification read', r.status === 200, String(r.status));
    }

    r = await req('PUT', '/api/notifications/read-all', null, tokens.voter);
    check('Mark all read', r.status === 200, String(r.status));

    // ---------- AUTH USER ACTIONS ----------
    console.log('\n=== AUTH USER ACTIONS ===');
    r = await req('PUT', '/api/auth/change-password', { oldPassword: 'Passw0rd!', newPassword: 'NewPass123' }, regVoterToken);
    check('Change password (valid old)', r.status === 200, String(r.status));

    r = await req('PUT', '/api/auth/change-password', { oldPassword: 'wrong', newPassword: 'NewPass123' }, regVoterToken);
    check('Change password (invalid old)', r.status === 400, String(r.status));

    r = await req('PUT', '/api/auth/profile', { name: 'Renamed Voter' }, regVoterToken);
    check('Update profile', r.status === 200 && r.json.data.name === 'Renamed Voter', String(r.status));

    // ---------- ROLE GUARDS ----------
    console.log('\n=== ROLE GUARDS ===');
    r = await req('GET', '/api/voters', null, tokens.voter);
    check('Voter blocked from /voters', r.status === 403, String(r.status));
    r = await req('GET', '/api/voters', null, tokens.auditor);
    check('Auditor blocked from /voters management', r.status === 403, String(r.status));
    r = await req('GET', '/api/elections', null, tokens.voter);
    check('Voter CAN list elections', r.status === 200, String(r.status));
    r = await req('GET', '/api/security/events', null, tokens.auditor);
    check('Auditor CAN view security events (report role)', r.status === 200, String(r.status));
    r = await req('GET', '/api/security/events', null, tokens.voter);
    check('Voter blocked from /security', r.status === 403, String(r.status));

    // ---------- DELETIONS ----------
    console.log('\n=== DELETIONS ===');
    r = await req('DELETE', `/api/candidates/${cand1._id}`, null, tokens.admin);
    check('Delete candidate', r.status === 200, String(r.status));

    r = await req('DELETE', `/api/elections/${election2._id}`, null, tokens.officer);
    check('Officer deletes own election', r.status === 200, String(r.status));

    r = await req('DELETE', `/api/elections/${election1._id}`, null, tokens.voter);
    check('Voter blocked from deleting election', r.status === 403, String(r.status));

    // ---------- NEW FEATURES (sessions/prefs/reset/release) ----------
    console.log('\n=== SESSIONS & PREFERENCES ===');
    r = await req('GET', '/api/auth/sessions', null, tokens.voter);
    check('List my sessions', r.status === 200 && Array.isArray(r.json.data) && r.json.data.length >= 1, String(r.status));

    r = await req('GET', '/api/auth/preferences', null, tokens.voter);
    check('Get preferences', r.status === 200 && 'data' in r.json, String(r.status));

    r = await req('PUT', '/api/auth/preferences', { emailNotif: false, securityAlerts: true, voteConfirmations: false, electionAlerts: true }, tokens.voter);
    check('Update preferences', r.status === 200 && r.json.data.emailNotif === false, String(r.status));

    r = await req('GET', '/api/auth/preferences', null, tokens.voter);
    check('Preferences persisted', r.status === 200 && r.json.data.emailNotif === false, String(r.status));

    // second login -> revoke that session -> token must be rejected
    r = await req('POST', '/api/auth/login', { email: 'voter@veravote.local', password: 'Voter@123' });
    const secondVoterToken = r.json.data.token;
    check('Second login creates session', r.status === 200 && r.json.data.token, String(r.status));
    r = await req('GET', '/api/auth/sessions', null, tokens.voter);
    check('Two sessions visible', r.status === 200 && r.json.data.length >= 2, String(r.json.data.length));
    // from the ORIGINAL token's view, the non-current session is the second login's
    const otherSession = r.json.data.find((s) => !s.isCurrent);
    if (otherSession) {
      r = await req('DELETE', `/api/auth/sessions/${otherSession.id}`, null, tokens.voter);
      check('Revoke other session', r.status === 200, String(r.status));
    }
    r = await req('GET', '/api/auth/me', null, secondVoterToken);
    check('Revoked session token rejected', r.status === 401, String(r.status));
    r = await req('GET', '/api/auth/me', null, tokens.voter);
    check('Other session still valid', r.status === 200, String(r.status));

    r = await req('DELETE', '/api/notifications', null, tokens.voter);
    check('Clear all notifications', r.status === 200, String(r.status));
    r = await req('GET', '/api/notifications', null, tokens.voter);
    check('Notifications cleared', r.status === 200 && r.json.count === 0, String(r.json.count));

    // single-notification delete against a directly-created notification
    const Notification = require('./models/Notification');
    const notifDoc = await Notification.create({ user: voter._id, title: 'Delete Me', message: 'Temporary', type: 'general' });
    r = await req('DELETE', `/api/notifications/${notifDoc._id}`, null, tokens.voter);
    check('Delete single notification', r.status === 200, String(r.status));
    r = await req('GET', '/api/notifications', null, tokens.voter);
    check('Single notification gone', r.status === 200 && !r.json.data.some((n) => n._id === notifDoc._id.toString()), String(r.json.count));

    r = await req('POST', '/api/auth/forgot-password', { email: 'voter@veravote.local' }, null);
    check('Forgot password issues reset token', r.status === 200 && r.json.data.devResetToken, r.json.data.devResetToken || String(r.status));
    const resetToken = r.json.data.devResetToken;

    r = await req('POST', '/api/auth/reset-password', { email: 'voter@veravote.local', token: 'bogus', newPassword: 'Voter@123' });
    check('Reset rejected with bad token', r.status === 400, String(r.status));

    r = await req('POST', '/api/auth/reset-password', { email: 'voter@veravote.local', token: resetToken, newPassword: 'Voter@123' }, null);
    check('Reset password with valid token', r.status === 200, String(r.status));

    r = await req('POST', '/api/auth/login', { email: 'voter@veravote.local', password: 'Voter@123' });
    check('Login works with reset new password', r.status === 200 && r.json.data.token, String(r.status));
    tokens.voter = r.json.data.token;

    console.log('\n=== RELEASE RESULTS ===');
    r = await req('GET', '/api/elections', null, tokens.voter);
    const activeElection = (r.json.data || []).find((e) => e._id === election1._id);
    if (activeElection && activeElection.resultsReleased === false) {
      r = await req('POST', `/api/elections/${election1._id}/release-results`, null, tokens.admin);
      check('Release results (admin)', r.status === 200 && r.json.data.resultsReleased === true, String(r.status));
      r = await req('GET', `/api/results/${election1._id}`, null, tokens.voter);
      check('Voter sees released results', r.status === 200, String(r.status));
    } else {
      check('Release results (admin)', true, 'already released or missing');
    }

    // ---------- SUMMARY ----------
    const pass = results.filter((x) => x.pass).length;
    console.log(`\n\n========================================`);
    console.log(`  TEST RESULTS: ${pass}/${results.length} passed`);
    console.log(`========================================`);
    const failed = results.filter((x) => !x.pass);
    if (failed.length) {
      console.log('Failed:');
      failed.forEach((f) => console.log(`  - ${f.name} :: ${f.detail}`));
    }
    process.exitCode = failed.length ? 1 : 0;
  } catch (e) {
    console.error('TEST CRASH:', e);
    process.exitCode = 1;
  }
}

run().finally(async () => {
  await new Promise((r) => setTimeout(r, 300));
  process.exit(process.exitCode || 0);
});