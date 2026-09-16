import { useState, useEffect } from 'react';
import { Vote, Users, BarChart3, TrendingUp, CalendarClock, UserCheck, PieChart, LineChart, Activity } from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  BarChart as ReBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.get();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loading text="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return <EmptyState icon={Activity} title="No analytics available" description="Analytics data could not be loaded." />;

  const { summary, votesPerDay = [], candidatePerformance = [] } = data;

  const unverifiedVoters = Math.max(0, (summary.totalVoters || 0) - (summary.verifiedVoters || 0));
  const verificationSlices = [
    { name: 'Verified', value: summary.verifiedVoters || 0 },
    { name: 'Unverified', value: unverifiedVoters },
  ];

  const candidateChartData = (candidatePerformance || []).map((p) => ({
    name: p.election?.name ? (p.election.name.length > 15 ? `${p.election.name.slice(0, 15)}...` : p.election.name) : 'Unknown',
    votes: p.totalVotes || 0,
  }));

  const statusCards = [
    { title: 'Ongoing Elections', value: summary.ongoingElections || 0, icon: CalendarClock },
    { title: 'Scheduled Elections', value: summary.scheduledElections || 0, icon: CalendarClock },
    { title: 'Ended Elections', value: summary.endedElections || 0, icon: CalendarClock },
    { title: 'Verified Voters', value: summary.verifiedVoters || 0, icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Election performance insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Vote} title="Total Elections" value={summary.totalElections?.toLocaleString()} />
        <StatsCard icon={Users} title="Total Voters" value={summary.totalVoters?.toLocaleString()} />
        <StatsCard icon={BarChart3} title="Total Votes Cast" value={summary.totalVotesCast?.toLocaleString()} />
        <StatsCard
          icon={TrendingUp}
          title="Participation Rate"
          value={`${summary.participationRate?.toFixed(1)}%`}
          trend={`${summary.participationRate?.toFixed(1)}%`}
          trendColor="green"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700">Voting Trends</h3>
          </div>
          {votesPerDay.length === 0 ? (
            <EmptyState icon={LineChart} title="No voting activity" description="Votes per day will appear here as elections run." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ReLineChart data={votesPerDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <ReLine type="monotone" dataKey="count" name="Votes" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </ReLineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700">Candidate Performance</h3>
          </div>
          {candidateChartData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No candidate data" description="Candidate performance will appear once votes are cast." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ReBarChart data={candidateChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="votes" name="Total Votes" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 self-start">
            <PieChart className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700 self-center">Participation Breakdown</h3>
          </div>
          <div className="flex flex-col items-center w-full">
            <ResponsiveContainer width="100%" height={200}>
              <RePieChart>
                <Pie data={verificationSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f1f5f9" />
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
            <p className="text-2xl font-bold text-gray-900 -mt-2">{summary.verificationRate?.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Verification Rate</p>
          </div>
          <div className="w-full mt-5 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Verified
              </span>
              <span className="font-medium text-gray-700">{summary.verifiedVoters?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block border border-slate-200" /> Unverified
              </span>
              <span className="font-medium text-gray-700">{unverifiedVoters.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((card, i) => (
          <StatsCard key={i} icon={card.icon} title={card.title} value={card.value?.toLocaleString()} />
        ))}
      </div>
    </div>
  );
}

export default Analytics;