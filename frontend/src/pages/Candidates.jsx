import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Search,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { candidatesAPI, electionsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const initialForm = {
  election: '',
  name: '',
  party: '',
  bio: '',
  photo: '',
  status: 'pending',
};

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function Candidates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin' || user?.role === 'election_officer';

  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [electionFilter, setElectionFilter] = useState(searchParams.get('election') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(initialForm);
  const [editCandidate, setEditCandidate] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', party: '', bio: '' });

  const fetchElections = useCallback(async () => {
    try {
      const res = await electionsAPI.getAll();
      setElections(res.data.data || []);
    } catch {
      // elections dropdown is secondary; ignore
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (electionFilter) params.election = electionFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await candidatesAPI.getAll(params);
      setCandidates(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [electionFilter, statusFilter, search]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    const param = searchParams.get('election');
    if (param && param !== electionFilter) setElectionFilter(param);
  }, [searchParams]);

  const handleApprove = async (candidate) => {
    try {
      await candidatesAPI.approve(candidate._id);
      toast.success(`${candidate.name} approved`);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (candidate) => {
    try {
      await candidatesAPI.reject(candidate._id);
      toast.success(`${candidate.name} rejected`);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleDelete = async (candidate) => {
    if (!window.confirm(`Delete candidate "${candidate.name}"? This action cannot be undone.`)) return;
    try {
      await candidatesAPI.delete(candidate._id);
      toast.success('Candidate deleted');
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  const openEdit = (candidate) => {
    setEditCandidate(candidate);
    setEditForm({
      name: candidate.name || '',
      party: candidate.party || '',
      bio: candidate.bio || '',
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editCandidate) return;
    setSaving(true);
    try {
      await candidatesAPI.update(editCandidate._id, {
        name: editForm.name,
        party: editForm.party,
        bio: editForm.bio,
      });
      toast.success('Candidate updated');
      setEditOpen(false);
      setEditCandidate(null);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChange = (e) => {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await candidatesAPI.create({
        name: addForm.name,
        party: addForm.party,
        bio: addForm.bio,
        photo: addForm.photo || undefined,
        election: addForm.election,
        status: addForm.status,
      });
      toast.success('Candidate created');
      setAddOpen(false);
      setAddForm(initialForm);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create candidate');
    } finally {
      setSaving(false);
    }
  };

  const selectedElectionName = elections.find((e) => e._id === electionFilter)?.name;

  const columns = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {getInitials(row.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{row.name}</p>
            {row.bio && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{row.bio}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Party / Group',
      render: (row) => <span className="text-gray-700">{row.party || '—'}</span>,
    },
    {
      key: 'election',
      header: 'Election',
      render: (row) => <span className="text-gray-700">{row.election?.name || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'votes',
      header: 'Votes',
      render: (row) => <span className="font-medium text-gray-700">{row.votes ?? 0}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {canManage && row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row)}
                title="Approve"
                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => handleReject(row)}
                title="Reject"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={16} />
              </button>
            </>
          )}
          {canManage && (
            <button
              onClick={() => openEdit(row)}
              title="Edit"
              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Pencil size={16} />
            </button>
          )}
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
      ),
    },
  ];

  const previewInitials = addForm.name
    ? addForm.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        subtitle="Manage electoral candidates"
        actions={
          canManage && <button onClick={() => setAddOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Add Candidate
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Search size={16} />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <select
            value={electionFilter}
            onChange={(e) => {
              setElectionFilter(e.target.value);
              if (e.target.value) {
                setSearchParams({ election: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            className="input-field sm:w-56"
          >
            <option value="">All Elections</option>
            {elections.map((el) => (
              <option key={el._id} value={el._id}>
                {el.name}
              </option>
            ))}
          </select>
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
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field sm:w-64"
          />
        </div>
      </div>

      {selectedElectionName && (
        <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
          <Info size={16} />
          <span>
            Showing candidates for <strong>{selectedElectionName}</strong>
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={candidates}
        loading={loading}
        error={error}
        onRetry={fetchCandidates}
        emptyTitle="No candidates found"
        emptyDescription={
          electionFilter || statusFilter || search
            ? 'No candidates match the current filters. Try adjusting them.'
            : 'No candidates yet. Add your first candidate to get started.'
        }
        emptyIcon={UserCheck}
      />

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setAddForm(initialForm); }} title="Add Candidate" size="lg">
        <form onSubmit={handleSubmitAdd} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Election</label>
              <select
                name="election"
                value={addForm.election}
                onChange={handleAddChange}
                required
                className="input-field"
              >
                <option value="">Select election</option>
                {elections.map((el) => (
                  <option key={el._id} value={el._id}>
                    {el.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                name="name"
                value={addForm.name}
                onChange={handleAddChange}
                required
                className="input-field"
                placeholder="Candidate name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party / Group</label>
              <input
                name="party"
                value={addForm.party}
                onChange={handleAddChange}
                className="input-field"
                placeholder="e.g. Party A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                value={addForm.bio}
                onChange={handleAddChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Brief description about the candidate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (optional)</label>
              <input
                name="photo"
                value={addForm.photo}
                onChange={handleAddChange}
                className="input-field"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={addForm.status}
                onChange={handleAddChange}
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center justify-start pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Preview</p>
            <div className="w-full card p-5 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold mb-3">
                {previewInitials}
              </div>
              <p className="font-bold text-gray-900 text-lg">
                {addForm.name || 'Candidate Name'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {addForm.party || 'Party / Group'}
              </p>
              {addForm.bio && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-3">{addForm.bio}</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setAddOpen(false); setAddForm(initialForm); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); setEditCandidate(null); }} title="Edit Candidate" size="md">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party / Group</label>
            <input
              name="party"
              value={editForm.party}
              onChange={handleEditChange}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={editForm.bio}
              onChange={handleEditChange}
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setEditOpen(false); setEditCandidate(null); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Candidates;
