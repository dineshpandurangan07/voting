import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  UserCheck,
  Users,
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Trophy,
  ClipboardList,
  Vote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { electionsAPI, candidatesAPI, votesAPI, resultsAPI, auditLogsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DataTable from '../components/common/DataTable';

const TABS = ['Overview', 'Candidates', 'Voters', 'Voting Activity', 'Results', 'Audit Logs'];

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function ElectionDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user?.role;
  const canManage = role === 'super_admin' || role === 'election_officer';

  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [votes, setVotes] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('Overview');

  const fetchElection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await electionsAPI.getOne(id);
      setElection(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load election');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchElection();
  }, [fetchElection]);

  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const res = await candidatesAPI.getAll({ election: id });
      setCandidates(res.data.data || []);
    } catch {
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, [id]);

  const fetchVotes = useCallback(async () => {
    setVotesLoading(true);
    try {
      const res = await votesAPI.getByElection(id);
      setVotes(res.data.data || []);
    } catch {
      setVotes([]);
    } finally {
      setVotesLoading(false);
    }
  }, [id]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await resultsAPI.get(id);
      setResults(res.data.data);
    } catch {
      setResults(null);
    } finally {
      setResultsLoading(false);
    }
  }, [id]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const res = await auditLogsAPI.getAll({ electionId: id });
      let logs = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      const filtered = logs.filter(
        (log) =>
          log.metadata?.electionId?.toString?.() === id ||
          log.electionId === id ||
          log.entityId === id
      );
      setAuditLogs(filtered.length > 0 ? filtered : logs);
    } catch {
      try {
        const res = await auditLogsAPI.getAll();
        const logs = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setAuditLogs(logs.filter((log) => log.metadata?.electionId?.toString?.() === id || log.electionId === id || log.entityId === id));
      } catch {
        setAuditLogs([]);
      }
    } finally {
      setAuditLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidates();
    fetchVotes();
    fetchResults();
    fetchAuditLogs();
  }, [fetchCandidates, fetchVotes, fetchResults, fetchAuditLogs]);

  const handleCandidateAction = async (candidate, action) => {
    try {
      if (action === 'approve') {
        await candidatesAPI.approve(candidate._id);
        toast.success('Candidate approved');
      } else {
        await candidatesAPI.reject(candidate._id);
        toast.success('Candidate rejected');
      }
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} candidate`);
    }
  };

  const handleCandidateDelete = async (candidate) => {
    if (!window.confirm(`Remove candidate "${candidate.name}"?`)) return;
    try {
      await candidatesAPI.delete(candidate._id);
      toast.success('Candidate removed');
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove candidate');
    }
  };

  if (loading) return <Loading text="Loading election details..." />;
  if (error || !election) return <ErrorState message={error || 'Election not found'} onRetry={fetchElection} />;

  const participationRate = results?.participationRate ?? (results?.totalVotes && results?.eligibleVoters
    ? ((results.totalVotes / results.eligibleVoters) * 100).toFixed(1)
    : 0);

  const candidateColumns = [
    {
      key: 'photo',
      header: 'Photo',
      render: (row) => {
        const initial = (row.name || '?').charAt(0).toUpperCase();
        return (
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
            {initial}
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: 'party',
      header: 'Party',
      render: (row) => <span className="text-gray-600">{row.party || 'Independent'}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'votes',
      header: 'Votes',
      render: (row) => <span className="text-gray-700">{row.votes ?? 0}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {canManage && row.status === 'pending' && (
            <>
              <button
                onClick={() => handleCandidateAction(row, 'approve')}
                title="Approve"
                className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={() => handleCandidateAction(row, 'reject')}
                title="Reject"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
          {canManage && (
            <button
              onClick={() => handleCandidateDelete(row)}
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

  const voteColumns = [
    {
      key: 'receiptId',
      header: 'Receipt ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">{row.receiptId || '—'}</span>
      ),
    },
    {
      key: 'voter',
      header: 'Voter',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.voter?.name || '—'}</p>
          <p className="text-xs text-gray-500">{row.voter?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.candidate?.name || '—'}</p>
          {row.candidate?.party && <p className="text-xs text-gray-500">{row.candidate.party}</p>}
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => <span className="text-gray-600">{formatDate(row.timestamp)}</span>,
    },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard icon={UserCheck} title="Total Candidates" value={candidates.length ?? election.candidates?.length ?? 0} subtitle="Registered" trend="View" />
        <StatsCard icon={Users} title="Eligible Voters" value={election.eligibleVoters?.length ?? 0} subtitle="Can vote" trend="View" />
        <StatsCard icon={BarChart3} title="Votes Cast" value={votes.length} subtitle="Total ballots" trend="Live" />
        <StatsCard
          icon={TrendingUp}
          title="Participation Rate"
          value={participationRate ? `${participationRate}%` : '—'}
          subtitle="Voter engagement"
          trend="Live"
        />
      </div>

      <div className="card">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{election.name}</h3>
            <p className="text-xs text-gray-500">
              {election.electionType} election · Created by {election.createdBy?.name || 'Administrator'}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={election.status} />
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">
            {election.description || 'No description provided for this election.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Starts</p>
              <p className="font-medium text-gray-900">{formatDate(election.startDate)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ends</p>
              <p className="font-medium text-gray-900">{formatDate(election.endDate)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Election Type</p>
              <p className="font-medium text-gray-900 capitalize">{election.electionType}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCandidates = () => (
    <DataTable
      columns={candidateColumns}
      data={candidates}
      loading={candidatesLoading}
      onRetry={fetchCandidates}
      emptyTitle="No candidates yet"
      emptyDescription="Candidates will appear here once they are registered for this election."
      emptyIcon={UserCheck}
    />
  );

  const renderVoters = () => {
    const voters = election.eligibleVoters || [];
    if (voters.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No eligible voters"
          description="No voters have been assigned to this election yet."
        />
      );
    }
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Voter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {voters.map((voter) => (
                <tr key={voter._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{voter.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{voter.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge status={voter.isVerified ? 'verified' : 'unverified'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVotingActivity = () => (
    <div className="space-y-4">
      {election.status === 'ongoing' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard icon={Vote} title="Vote Cast Tally" value={votes.length} subtitle="Total during window" trendColor="green" trend="Live" />
          <StatsCard icon={BarChart3} title="Unique Voters" value={new Set(votes.map((v) => v.voter?._id)).size} subtitle="Distinct ballots" trend="View" />
          <StatsCard
            icon={TrendingUp}
            title="Turnout"
            value={election.eligibleVoters?.length ? `${((votes.length / election.eligibleVoters.length) * 100).toFixed(1)}%` : '—'}
            subtitle="Of eligible voters"
            trend="View"
          />
        </div>
      )}
      <DataTable
        columns={voteColumns}
        data={votes}
        loading={votesLoading}
        onRetry={fetchVotes}
        emptyTitle="No votes recorded"
        emptyDescription="Votes will appear here once voters cast their ballots."
        emptyIcon={Vote}
      />
    </div>
  );

  const renderResults = () => {
    if (resultsLoading) return <Loading text="Loading results..." />;

    if (results?.election?.resultsReleased === false && role === 'voter') {
      return (
        <div className="card flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
            <Lock size={30} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Results not released yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            The election organizers haven't released results for this election. Please check back later.
          </p>
        </div>
      );
    }

    if (!results || !results.results || results.results.length === 0) {
      return (
        <EmptyState
          icon={PieChart}
          title="No results available"
          description="Results will be published once the election concludes."
        />
      );
    }

    return (
      <div className="space-y-6">
        {results.winner && (
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Trophy size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600 mb-0.5">Winner</p>
              <p className="text-xl font-bold text-gray-900 truncate">{results.winner.name}</p>
              {results.winner.party && <p className="text-sm text-gray-500">{results.winner.party}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-900">{results.winner.votes}</p>
              <p className="text-xs text-gray-500">{results.winner.percentage?.toFixed ? `${results.winner.percentage.toFixed(1)}%` : `${results.winner.percentage}%`}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard icon={Users} title="Eligible Voters" value={results.eligibleVoters} subtitle="Registered" trend="View" />
          <StatsCard icon={BarChart3} title="Total Votes" value={results.totalVotes} subtitle="Ballots cast" trend="View" />
          <StatsCard
            icon={TrendingUp}
            title="Participation Rate"
            value={`${Number(results.participationRate ?? 0).toFixed(1)}%`}
            subtitle="Turnout"
            trend="Live"
          />
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Candidate Results</h3>
          <div className="space-y-4">
            {results.results.map((r) => (
              <div key={r.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    {r.party && <span className="text-xs text-gray-500 truncate">{r.party}</span>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-semibold text-gray-600">{r.votes} votes</span>
                    <span className="text-sm font-bold text-primary-600 w-14 text-right">
                      {Number(r.percentage ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Number(r.percentage ?? 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAuditLogs = () => {
    if (auditLogsLoading) return <Loading text="Loading audit logs..." />;
    if (auditLogs.length === 0) {
      return (
        <EmptyState
          icon={ShieldCheck}
          title="No audit logs"
          description="No audit events have been recorded for this election yet."
        />
      );
    }
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log, idx) => (
                <tr key={log._id || idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <ShieldCheck size={14} className="text-primary-500" />
                      {log.action || log.eventType || 'Event'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.user?.name || log.actor?.name || 'System'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {log.details || log.description || log.message || JSON.stringify(log.metadata || {})}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.timestamp || log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/elections" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3">
          <ArrowLeft size={15} />
          Back to Elections
        </Link>
        <PageHeader
          title={election.name}
          subtitle={`${election.electionType} election · ${candidates.length || election.candidates?.length || 0} candidates · ${election.eligibleVoters?.length || 0} eligible voters`}
          actions={<StatusBadge status={election.status} />}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Candidates' && renderCandidates()}
        {activeTab === 'Voters' && renderVoters()}
        {activeTab === 'Voting Activity' && renderVotingActivity()}
        {activeTab === 'Results' && renderResults()}
        {activeTab === 'Audit Logs' && renderAuditLogs()}
      </div>
    </div>
  );
}

export default ElectionDetails;