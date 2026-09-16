import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  Power,
  Eye,
  History,
  UserCheck,
  Mail,
  Phone,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { votersAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';

const VERIFY_OPTIONS = [
  { value: '', label: 'All Verification' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Voters() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [profileVoter, setProfileVoter] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDetail, setProfileDetail] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [historyVoter, setHistoryVoter] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (verifyFilter) params.verified = verifyFilter;
      if (activeFilter) params.active = activeFilter;
      const res = await votersAPI.getAll(params);
      setVoters(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load voters');
    } finally {
      setLoading(false);
    }
  }, [search, verifyFilter, activeFilter]);

  useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  const handleVerify = async (voter) => {
    try {
      await votersAPI.verify(voter._id);
      toast.success(`${voter.name} verified`);
      fetchVoters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify voter');
    }
  };

  const handleToggleActive = async (voter) => {
    try {
      const res = await votersAPI.toggleActive(voter._id);
      toast.success(res.data.message || `${voter.name} updated`);
      fetchVoters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update voter');
    }
  };

  const openProfile = async (voter) => {
    setProfileVoter(voter);
    setProfileOpen(true);
    setProfileDetail(null);
    setProfileLoading(true);
    try {
      const res = await votersAPI.getOne(voter._id);
      setProfileDetail(res.data.data);
    } catch {
      setProfileDetail(voter);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadHistory = async (voterId) => {
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await votersAPI.getHistory(voterId);
      setHistoryData(res.data.data);
    } catch {
      toast.error('Failed to load voting history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = async (voter) => {
    setHistoryVoter(voter);
    setHistoryOpen(true);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const res = await votersAPI.getHistory(voter._id);
      setHistoryData(res.data.data);
    } catch {
      toast.error('Failed to load voting history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    {
      key: 'voterId',
      header: 'Voter ID',
      render: (row) => (
        <span
          title={row._id}
          className="font-mono text-xs text-gray-500 cursor-help"
        >
          {row._id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-gray-600 text-sm">{row.email}</span>
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (row) => (
        <StatusBadge status={row.isVerified ? 'verified' : 'unverified'} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: (row) => (
        <span className="text-gray-600 text-sm">
          {formatDateTime(row.lastLogin)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openProfile(row)}
            title="View profile"
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <Eye size={16} />
          </button>
          {!row.isVerified && (
            <button
              onClick={() => handleVerify(row)}
              title="Verify"
              className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <ShieldCheck size={16} />
            </button>
          )}
          <button
            onClick={() => handleToggleActive(row)}
            title={row.isActive ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Power size={16} />
          </button>
          <button
            onClick={() => openHistory(row)}
            title="Voting history"
            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          >
            <History size={16} />
          </button>
        </div>
      ),
    },
  ];

  const detail = profileDetail || profileVoter;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voters"
        subtitle="Manage voter accounts and eligibility"
        actions={
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search voters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 sm:w-64"
            />
          </div>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Search size={16} />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field sm:w-64"
          />
          <select
            value={verifyFilter}
            onChange={(e) => setVerifyFilter(e.target.value)}
            className="input-field sm:w-48"
          >
            {VERIFY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="input-field sm:w-44"
          >
            {ACTIVE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={voters}
        loading={loading}
        error={error}
        onRetry={fetchVoters}
        emptyTitle="No voters found"
        emptyDescription={
          search || verifyFilter || activeFilter
            ? 'No voters match the current filters. Try adjusting them.'
            : 'No voters registered yet.'
        }
        emptyIcon={Users}
      />

      {/* Profile Modal */}
      <Modal isOpen={profileOpen} onClose={() => { setProfileOpen(false); setProfileDetail(null); }} title="Voter Profile" size="md">
        {profileLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {detail.name
                  ?.split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '??'}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{detail.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={detail.isVerified ? 'verified' : 'unverified'} />
                  <StatusBadge status={detail.isActive ? 'active' : 'inactive'} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{detail.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{detail.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <BadgeCheck size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Registered</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(detail.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <UserCheck size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(detail.lastLogin)}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => loadHistory(detail._id)}
                disabled={historyLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <History size={15} />
                {historyLoading ? 'Loading...' : 'Load Voting History'}
              </button>
            </div>

            {historyData?.votes && historyData.votes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Voting History</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {historyData.votes.map((vote) => (
                    <div key={vote._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{vote.election?.name}</p>
                        <p className="text-xs text-gray-500">
                          Voted for <span className="font-medium text-gray-700">{vote.candidate?.name}</span>
                          {vote.candidate?.party ? ` (${vote.candidate.party})` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs font-mono text-gray-400">{vote.receiptId}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(vote.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {historyData?.votes && historyData.votes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No votes cast yet.</p>
            )}
          </div>
        ) : null}
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyOpen} onClose={() => { setHistoryOpen(false); setHistoryData(null); }} title="Voting History" size="md">
        {historyLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : historyData ? (
          <div className="space-y-3">
            {historyData.voter && (
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                  {historyData.voter.name
                    ?.split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '??'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{historyData.voter.name}</p>
                  <p className="text-xs text-gray-500">{historyData.voter.email}</p>
                </div>
              </div>
            )}

            {historyData.votes && historyData.votes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Election</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Candidate</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Receipt</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historyData.votes.map((vote) => (
                      <tr key={vote._id}>
                        <td className="py-2.5 px-3 text-gray-700">{vote.election?.name || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-700">
                          {vote.candidate?.name || '—'}
                          {vote.candidate?.party ? <span className="text-gray-400 ml-1">({vote.candidate.party})</span> : null}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{vote.receiptId}</td>
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{formatDateTime(vote.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No votes cast yet.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default Voters;
