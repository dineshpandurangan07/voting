import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Users, BarChart3, TrendingUp, AlertTriangle, Unlock, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { resultsAPI, electionsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import ErrorState from '../components/common/ErrorState';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function Results() {
  const { electionId } = useParams();
  const { user } = useAuth();
  const role = user?.role;
  const canRelease = role === 'super_admin' || role === 'election_officer';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [releasing, setReleasing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resultsAPI.get(electionId);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [electionId]);

  const handleRelease = async () => {
    if (!window.confirm('Release results to all voters? This cannot be undone.')) return;
    setReleasing(true);
    try {
      await electionsAPI.releaseResults(electionId);
      toast.success('Results released to voters');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release results');
    } finally {
      setReleasing(false);
    }
  };

  if (loading) return <Loading text="Loading results..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return <ErrorState message="No results data available" />;

  const { election, totalVotes, eligibleVoters, participationRate, winner, results } = data;
  const isPreview = !election.resultsReleased && ['super_admin', 'election_officer', 'auditor'].includes(role);
  const isLocked = !election.resultsReleased && role === 'voter';

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
          <Trophy size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Results Not Yet Released</h2>
        <p className="text-sm text-gray-500 mb-6">Results for this election have not been publicly released yet.</p>
        <Link to="/voter-dashboard" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const participationData = [
    { name: 'Voted', value: totalVotes || 0 },
    { name: 'Not Voted', value: (eligibleVoters || 0) - (totalVotes || 0) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Election Results"
        subtitle={election.name}
        actions={<StatusBadge status={election.status} />}
      />

      {isPreview && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
        >
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium flex-1">Preview — results not yet publicly released</p>
          {canRelease && (
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {releasing ? <Loader2 size={15} className="animate-spin" /> : <Unlock size={15} />}
              Release Results
            </button>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={Users} title="Total Eligible Voters" value={eligibleVoters?.toLocaleString()} />
        <StatsCard icon={BarChart3} title="Votes Cast" value={totalVotes?.toLocaleString()} />
        <StatsCard icon={TrendingUp} title="Participation Rate" value={`${participationRate?.toFixed(1)}%`} trend={`${participationRate?.toFixed(1)}%`} trendColor="green" />
      </div>

      {winner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Trophy size={26} />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-0.5">Winner</p>
              <h3 className="text-lg font-bold text-gray-900">{winner.name}</h3>
              <p className="text-sm text-gray-600">
                {winner.party && <span>{winner.party} · </span>}
                {winner.votes?.toLocaleString()} votes ({winner.percentage?.toFixed(1)}%)
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Candidate Results</h3>
        <div className="space-y-3">
          {(results || []).map((r, i) => {
            const isWinner = winner && r.id === winner.id;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-lg border ${isWinner ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-white'}`}
              >
                <span className="text-xs font-bold text-gray-400 w-5 text-center">#{i + 1}</span>
                {r.photo ? (
                  <img src={r.photo} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {r.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                    {r.party && <span className="text-xs text-gray-500">({r.party})</span>}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${r.percentage || 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{r.votes?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{r.percentage?.toFixed(1)}%</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Vote Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={results || []}
                dataKey="votes"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percentage }) => `${name} (${percentage?.toFixed(1)}%)`}
              >
                {(results || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Participation</h3>
          <div className="flex flex-col items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={participationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-2xl font-bold text-gray-900 -mt-2">{participationRate?.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Participation Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
