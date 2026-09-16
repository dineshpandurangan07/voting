import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  CalendarClock,
  Users,
  FileText,
  ChevronLeft,
  Save,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { electionsAPI, votersAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import Loading from '../components/common/Loading';
import ErrorState from '../components/common/ErrorState';

const ELECTION_TYPES = ['student', 'organization', 'committee', 'general', 'custom'];
const STATUS_OPTIONS = ['draft', 'scheduled', 'ongoing', 'paused', 'ended'];

function CreateElection() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    electionType: 'general',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    status: 'scheduled',
  });
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [voters, setVoters] = useState([]);
  const [votersLoading, setVotersLoading] = useState(true);
  const [votersError, setVotersError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setVotersLoading(true);
      setVotersError(null);
      try {
        const res = await votersAPI.getAll();
        if (active) setVoters(res.data.data || []);
      } catch (err) {
        if (active) setVotersError(err.response?.data?.message || 'Failed to load voters');
      } finally {
        if (active) setVotersLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleVoter = (id) => {
    setSelectedVoters((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const startISO = useMemo(
    () => (form.startDate && form.startTime ? new Date(`${form.startDate}T${form.startTime}`) : null),
    [form.startDate, form.startTime]
  );
  const endISO = useMemo(
    () => (form.endDate && form.endTime ? new Date(`${form.endDate}T${form.endTime}`) : null),
    [form.endDate, form.endTime]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) return setFormError('Election name is required.');
    if (!form.startDate || !form.startTime) return setFormError('Start date and time are required.');
    if (!form.endDate || !form.endTime) return setFormError('End date and time are required.');

    if (!startISO || !endISO) return setFormError('Please enter valid start and end date/time.');
    if (endISO <= startISO) return setFormError('End date and time must be after the start.');

    setSubmitting(true);
    try {
      await electionsAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
        electionType: form.electionType,
        status: form.status,
        startDate: startISO.toISOString(),
        endDate: endISO.toISOString(),
        eligibleVoters: selectedVoters,
      });
      toast.success('Election created successfully');
      navigate('/elections');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create election');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'input-field';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Election"
        subtitle="Set up a new election"
        actions={
          <button onClick={() => navigate('/elections')} className="btn-secondary inline-flex items-center gap-2">
            <ChevronLeft size={16} />
            Back
          </button>
        }
      />

      <div className="card max-w-3xl p-6">
        {votersLoading ? (
          <Loading text="Loading voters..." />
        ) : votersError ? (
          <ErrorState message={votersError} onRetry={() => navigate('/elections')} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Election Name</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Student Council 2026"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the purpose, scope, and rules of this election"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Election Type</label>
                <div className="relative">
                  <CalendarPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select name="electionType" value={form.electionType} onChange={handleChange} className={`${inputClass} pl-10`}>
                    {ELECTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Start Time</label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Time</label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Eligible Voters{' '}
                  <span className="text-xs text-gray-400 font-normal">({selectedVoters.length} selected)</span>
                </label>
                <div className="border border-gray-300 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {voters.length === 0 ? (
                    <p className="text-sm text-gray-400 p-4 text-center">No voters found.</p>
                  ) : (
                    voters.map((voter) => (
                      <label
                        key={voter._id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVoters.includes(voter._id)}
                          onChange={() => toggleVoter(voter._id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <Users size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{voter.name}</span>
                        <span className="text-xs text-gray-500 ml-auto truncate">{voter.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => navigate('/elections')} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submitting ? 'Creating...' : 'Create Election'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreateElection;