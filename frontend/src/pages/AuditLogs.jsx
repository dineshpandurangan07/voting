import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Filter, ChevronLeft, ChevronRight, FileClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { auditLogsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import DataTable from '../components/common/DataTable';

const ACTION_OPTIONS = [
  '', 'login', 'logout', 'vote_cast', 'election_created', 'election_updated',
  'election_closed', 'election_deleted', 'results_released', 'candidate_added',
  'candidate_updated', 'candidate_deleted', 'candidate_approved', 'candidate_rejected',
  'voter_verified', 'failed_login', 'security_alert', 'session_revoked', 'logout_all',
  'password_changed', 'password_reset', 'profile_updated', 'preferences_updated',
  'notification_deleted', 'admin_action'
];

const actionColors = {
  login: 'approved',
  logout: 'ended',
  vote_cast: 'scheduled',
  election_created: 'new',
  election_updated: 'under_review',
  election_deleted: 'high',
  results_released: 'new',
  candidate_added: 'pending',
  candidate_updated: 'under_review',
  candidate_deleted: 'high',
  candidate_approved: 'approved',
  candidate_rejected: 'rejected',
  voter_verified: 'verified',
  failed_login: 'high',
  security_alert: 'high',
  session_revoked: 'rejected',
  logout_all: 'rejected',
  password_changed: 'under_review',
  password_reset: 'new',
  profile_updated: 'under_review',
  preferences_updated: 'verified',
  notification_deleted: 'ended',
  admin_action: 'new',
  election_closed: 'ended',
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: p, limit: 20 };
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await auditLogsAPI.getAll(params);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (row) => (
        <span className="font-mono text-xs">{timeAgo(row.createdAt)}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) =>
        row.user ? (
          <div>
            <p className="font-medium text-gray-800">{row.user.name}</p>
            <p className="text-xs text-gray-400">{row.user.email}</p>
          </div>
        ) : (
          <span className="text-gray-400 text-xs italic">System</span>
        ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) =>
        row.role ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 uppercase tracking-wider">
            {row.role.replace('_', ' ')}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <StatusBadge status={actionColors[row.action] || 'default'} className="capitalize" />,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <p className="max-w-xs truncate text-gray-600 text-xs" title={row.description}>
          {row.description}
        </p>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">{row.ipAddress || '—'}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Complete trail of system activity"
        actions={
          <button onClick={() => fetchLogs(page)} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            className="input-field w-auto min-w-[160px]"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="input-field w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="input-field w-auto"
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto">{total} total logs</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        error={error}
        onRetry={() => fetchLogs(page)}
        emptyTitle="No audit logs found"
        emptyDescription="No activity matches your filter criteria."
        emptyIcon={FileClock}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total} total entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
              className="btn-secondary inline-flex items-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchLogs(page + 1)}
              className="btn-secondary inline-flex items-center gap-1 disabled:opacity-50"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}