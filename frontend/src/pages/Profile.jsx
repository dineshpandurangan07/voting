import { useState } from 'react';
import { User, Mail, Phone, ShieldCheck, CalendarDays, LogIn, Pencil, BadgeCheck, PencilLine, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const roleLabel = {
  super_admin: 'Super Admin',
  election_officer: 'Election Officer',
  auditor: 'Auditor',
  voter: 'Voter',
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatar: user?.avatar || '' });

  const openEdit = () => {
    setForm({ name: user?.name || '', phone: user?.phone || '', avatar: user?.avatar || '' });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data.data);
      toast.success(res.data.message || 'Profile updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account information" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
            {String(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
          <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <StatusBadge status={user?.role === 'super_admin' ? 'approved' : user?.role} />
            <StatusBadge status={user?.isActive ? 'active' : 'inactive'} />
          </div>
          <button onClick={openEdit} className="btn-primary inline-flex items-center gap-2">
            <Pencil size={15} /> Edit Profile
          </button>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <BadgeCheck size={13} />
            Member since {fmtDate(user?.createdAt)}
          </p>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Account Information</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={User} label="Full Name" value={user?.name} />
            <InfoItem icon={Mail} label="Email" value={user?.email} />
            <InfoItem icon={Phone} label="Phone" value={user?.phone || '—'} />
            <InfoItem icon={ShieldCheck} label="Role" value={roleLabel[user?.role] || user?.role} highlight />
            <InfoItem icon={BadgeCheck} label="Verification" value={user?.isVerified ? 'Verified' : 'Unverified'} />
            <InfoItem icon={CalendarDays} label="Registration Date" value={fmtDate(user?.createdAt)} />
            <InfoItem icon={LogIn} label="Last Login" value={fmtDateTime(user?.lastLogin)} />
            <InfoItem icon={ShieldCheck} label="Account Status" value={user?.isActive ? 'Active' : 'Inactive'} />
          </dl>
        </div>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL (optional)</label>
            <input
              type="url"
              className="input-field"
              value={form.avatar}
              onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              <PencilLine size={14} /> Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3.5 border ${highlight ? 'bg-primary-50/50 border-primary-100' : 'bg-gray-50/60 border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={highlight ? 'text-primary-600' : 'text-gray-400'} />
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}