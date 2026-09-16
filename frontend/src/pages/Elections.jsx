import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Vote,
  PlayCircle,
  CalendarClock,
  Flag,
  Plus,
  Eye,
  Pencil,
  UserCheck,
  PieChart,
  Trash2,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { electionsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
];

const ELECTION_TYPES = ['student', 'organization', 'committee', 'general', 'custom'];

const toDateTimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function Elections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'election_officer';

  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (fromDate) params.from = `${fromDate}T00:00:00`;
      if (toDate) params.to = `${toDate}T23:59:59`;
      const res = await electionsAPI.getAll(params);
      setElections(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load elections');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await electionsAPI.getStats();
      setStats(res.data.data);
    } catch {
      // stats are decorative; ignore
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDelete = async (election) => {
    if (!window.confirm(`Delete election "${election.name}"? This action cannot be undone.`)) return;
    try {
      await electionsAPI.delete(election._id);
      toast.success('Election deleted successfully');
      fetchElections();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete election');
    }
  };

  const openEdit = (election) => {
    setEditing({
      _id: election._id,
      name: election.name || '',
      electionType: election.electionType || 'general',
      status: election.status || 'draft',
      startDate: toDateTimeLocal(election.startDate),
      endDate: toDateTimeLocal(election.endDate),
      description: election.description || '',
    });
  };

  const handleEditChange = (e) => {
    setEditing((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await electionsAPI.update(editing._id, {
        name: editing.name,
        description: editing.description,
        electionType: editing.electionType,
        status: editing.status,
        startDate: new Date(editing.startDate).toISOString(),
        endDate: new Date(editing.endDate).toISOString(),
      });
      toast.success('Election updated successfully');
      setEditing(null);
      fetchElections();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update election');
    } finally {
      setSaving(false);
    }
  };

  const renderActions = (row) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => navigate(`/elections/${row._id}`)}
        title="View"
        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
      >
        <Eye size={16} />
      </button>
      {canManage && (
        <button
          onClick={() => openEdit(row)}
          title="Edit"
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Pencil size={16} />
        </button>
      )}
      <button
        onClick={() => navigate(`/candidates?election=${row._id}`)}
        title="Candidates"
        className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
      >
        <UserCheck size={16} />
      </button>
      <button
        onClick={() => navigate(`/results/${row._id}`)}
        title="Results"
        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
      >
        <PieChart size={16} />
      </button>
      {canManage && (
        <button
          onClick={() => handleDelete(row)}
          title="Delete"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const columns = [
    {
      key: 'name',
      header: 'Election Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.electionType && (
            <p className="text-xs text-gray-500 capitalize mt-0.5">{row.electionType}</p>
          )}
        </div>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row) => (
        <span className="text-gray-600">
          {new Date(row.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row) => (
        <span className="text-gray-600">
          {new Date(row.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'candidates',
      header: 'Candidates',
      render: (row) => <span className="text-gray-700">{row.candidates?.length ?? 0}</span>,
    },
    {
      key: 'eligibleVoters',
      header: 'Eligible Voters',
      render: (row) => <span className="text-gray-700">{row.eligibleVoters?.length ?? 0}</span>,
    },
    { key: 'actions', header: 'Actions', render: renderActions },
  ];

  const statsCards = [
    { icon: Vote, title: 'Total Elections', value: stats?.total, subtitle: 'All time', trend: 'All' },
    { icon: PlayCircle, title: 'Ongoing', value: stats?.ongoing, subtitle: 'Currently active', trend: 'Live' },
    { icon: CalendarClock, title: 'Upcoming', value: stats?.upcoming, subtitle: 'Scheduled', trend: 'View' },
    { icon: Flag, title: 'Ended', value: stats?.ended, subtitle: 'Completed', trend: 'View' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Elections"
        subtitle="Manage and monitor all elections"
        actions={
          canManage ? (
            <button onClick={() => navigate('/elections/new')} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Create Election
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            trend={card.trend}
            loading={!stats}
          />
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field sm:w-48"
              aria-label="Start date filter"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field sm:w-48"
              aria-label="End date filter"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-44"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          <DataTable
            columns={columns}
            data={elections}
            loading={loading}
            error={error}
            onRetry={fetchElections}
            emptyTitle="No elections found"
            emptyDescription={
              statusFilter !== 'all' || fromDate || toDate
                ? 'No elections match the current filters. Try adjusting them.'
                : 'No elections yet. Create your first election to get started.'
            }
            emptyIcon={Vote}
          />
        </div>
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Election" size="lg">
        {editing && (
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Election Name</label>
              <input
                name="name"
                value={editing.name}
                onChange={handleEditChange}
                required
                className="input-field"
                placeholder="e.g. Student Council 2026"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election Type</label>
                <select name="electionType" value={editing.electionType} onChange={handleEditChange} className="input-field">
                  {ELECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={editing.status} onChange={handleEditChange} className="input-field">
                  {['draft', 'scheduled', 'ongoing', 'paused', 'ended'].map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={editing.startDate}
                  onChange={handleEditChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={editing.endDate}
                  onChange={handleEditChange}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={editing.description}
                onChange={handleEditChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Describe the purpose and scope of this election"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default Elections;