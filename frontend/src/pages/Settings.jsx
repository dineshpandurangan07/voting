import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, KeyRound, Bell, ShieldCheck, Save, Loader2, AlertTriangle, MonitorSmartphone, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';

const DEFAULT_PREFS = {
  emailNotif: true,
  electionAlerts: true,
  securityAlerts: true,
  voteConfirmations: true,
};

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pflSaving, setPflSaving] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  useEffect(() => {
    authAPI
      .getPreferences()
      .then((res) => setPrefs({ ...DEFAULT_PREFS, ...(res.data?.data || {}) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await authAPI.getSessions();
      setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setPflSaving(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data?.data || { ...user, ...profileForm });
      toast.success('Profile updated');
      setProfileOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setPflSaving(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pw.oldPassword || !pw.newPassword || !pw.confirmPassword) {
      setPwError('All fields are required');
      return;
    }
    if (pw.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      const res = await authAPI.changePassword({ oldPassword: pw.oldPassword, newPassword: pw.newPassword });
      toast.success(res.data?.message || 'Password changed successfully');
      setPw({ oldPassword: '', newPassword: '', confirmPassword: '' });
      loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const togglePref = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefsSaving(true);
    try {
      await authAPI.updatePreferences(next);
      toast.success('Preferences saved');
    } catch (err) {
      setPrefs(prefs);
      toast.error(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await authAPI.revokeSession(id);
      toast.success('Session revoked');
      loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      await authAPI.revokeAllSessions();
      toast.success('Signed out from all devices');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign out from all devices');
      setLogoutAllLoading(false);
    }
  };

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${checked ? 'bg-primary-600' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );

  const fmtAgent = (ua) => {
    if (!ua) return 'Unknown device';
    if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile device';
    if (/edg/i.test(ua)) return 'Browser (Edge)';
    if (/chrome/i.test(ua)) return 'Browser (Chrome)';
    if (/firefox/i.test(ua)) return 'Browser (Firefox)';
    if (/safari/i.test(ua)) return 'Browser (Safari)';
    return ua.slice(0, 40);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, security and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <SectionHead icon={UserCircle} color="bg-primary-50 text-primary-600" title="Profile" sub="Update your personal information" />
          <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-3.5 mb-3">
            <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-500">{user?.phone || 'No phone'}</p>
          </div>
          <button onClick={() => { setProfileForm({ name: user?.name, phone: user?.phone }); setProfileOpen(true); }} className="btn-secondary inline-flex items-center gap-2">
            <Save size={14} /> Edit Profile
          </button>
          {profileOpen && (
            <form onSubmit={handleProfileSave} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <input className="input-field" placeholder="Full name" value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="input-field" placeholder="Phone" value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setProfileOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={pflSaving} className="btn-primary inline-flex items-center gap-2">
                  {pflSaving && <Loader2 size={14} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="card p-5">
          <SectionHead icon={KeyRound} color="bg-amber-50 text-amber-600" title="Security" sub="Change your password" />
          <form onSubmit={handlePwSubmit} className="space-y-3">
            <input type="password" className="input-field" placeholder="Current password"
              value={pw.oldPassword} onChange={(e) => setPw((f) => ({ ...f, oldPassword: e.target.value }))} />
            <input type="password" className="input-field" placeholder="New password (min 6 characters)"
              value={pw.newPassword} onChange={(e) => setPw((f) => ({ ...f, newPassword: e.target.value }))} />
            <input type="password" className="input-field" placeholder="Confirm new password"
              value={pw.confirmPassword} onChange={(e) => setPw((f) => ({ ...f, confirmPassword: e.target.value }))} />
            {pwError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> {pwError}</p>}
            <button type="submit" disabled={pwSaving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {pwSaving && <Loader2 size={14} className="animate-spin" />} Update Password
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <ShieldCheck size={13} /> Use a strong password you haven't used elsewhere.
          </p>
        </section>

        <section className="card p-5">
          <SectionHead icon={Bell} color="bg-blue-50 text-blue-600" title="Notifications" sub="Choose what you want to be notified about" />
          <div className="space-y-3">
            {Object.entries(prefs).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between rounded-xl bg-gray-50/70 border border-gray-100 p-3">
                <p className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <div className="flex items-center gap-2">
                  {prefsSaving && <Loader2 size={14} className="animate-spin text-primary-500" />}
                  <Toggle checked={val} onChange={(v) => togglePref(key, v)} disabled={prefsSaving} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <SectionHead icon={MonitorSmartphone} color="bg-violet-50 text-violet-600" title="Active sessions" sub="Manage devices signed in to your account" />
          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-3"><Loader2 size={16} className="animate-spin" /> Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500 py-3">No active sessions.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50/70 border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      {fmtAgent(s.userAgent)}
                      {s.isCurrent && <span className="text-[10px] font-semibold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Current</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.ipAddress || 'Unknown IP'} · {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button onClick={() => handleRevokeSession(s.id)} className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1">
                      <Trash2 size={13} /> Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button className="btn-danger inline-flex items-center gap-2" onClick={handleLogoutAll} disabled={logoutAllLoading}>
            {logoutAllLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Sign out from all devices
          </button>
        </section>

        <section className="card p-5 lg:col-span-2">
          <SectionHead icon={AlertTriangle} color="bg-red-50 text-red-600" title="Account" sub="Account status and warnings" />
          <div className="rounded-xl bg-red-50/50 border border-red-100 p-3.5 text-xs text-red-600">
            Account status: <span className="font-semibold">{user?.isActive ? 'Active' : 'Inactive'}</span>
            {!user?.isVerified && <span className="block mt-1">Your account is not yet verified by an administrator.</span>}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, color, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}