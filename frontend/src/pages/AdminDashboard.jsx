import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Vote, PlayCircle, CalendarClock, Flag, BarChart3, TrendingUp, Plus, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { electionsAPI, analyticsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'super_admin' || user?.role === 'election_officer';

  const [stats, setStats] = useState(null);
  const [recentElections, setRecentElections] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, electionsRes, analyticsRes] = await Promise.all([
        electionsAPI.getStats(),
        electionsAPI.getAll({ limit: 5 }),
        analyticsAPI.get(),
      ]);
      setStats(statsRes.data.data);
      setRecentElections(electionsRes.data.data.slice(0, 5));
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statsCards = stats
    ? [
        { icon: Vote, title: 'Total Elections', value: stats.total, subtitle: 'All time', trendColor: 'blue', trend: 'All time' },
        { icon: PlayCircle, title: 'Ongoing Elections', value: stats.ongoing, subtitle: 'Currently active', trendColor: 'green', trend: 'Live' },
        { icon: CalendarClock, title: 'Upcoming Elections', value: stats.upcoming, subtitle: 'Scheduled', trendColor: 'amber', trend: 'View' },
        { icon: Flag, title: 'Ended Elections', value: stats.ended, subtitle: 'Completed', trendColor: 'red', trend: 'View' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your voting system"
        actions={
          canManage ? (
            <button
              onClick={() => navigate('/elections/new')}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Election
            </button>
          ) : undefined
        }
      />

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {user?.name}</h2>
            <p className="mt-1 text-primary-100">{today}</p>
            <p className="mt-2 text-primary-200 text-sm max-w-xl">
              Here's an overview of your voting system performance. Monitor elections, track voter engagement, and manage your platform.
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary-200 text-sm">
            <Activity className="h-5 w-5" />
            <span>System Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading text="Loading dashboard..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statsCards.map((card) => (
              <StatsCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                trend={card.trend}
                trendColor={card.trendColor}
                loading={loading}
              />
            ))}
          </div>

          {analytics?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard
                icon={BarChart3}
                title="Total Votes Cast"
                value={analytics.summary.totalVotesCast}
                subtitle="Across all elections"
                trendColor="blue"
                trend="All time"
                loading={loading}
              />
              <StatsCard
                icon={TrendingUp}
                title="Participation Rate"
                value={`${analytics.summary.participationRate?.toFixed(1) || 0}%`}
                subtitle="Voter engagement"
                trendColor="green"
                trend="Live"
                loading={loading}
              />
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Elections</h3>
              <Link
                to="/elections"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {recentElections.length === 0 ? (
              <EmptyState
                icon={Vote}
                title="No elections yet"
                description="Create your first election to get started."
                action={
                  canManage ? (
                    <button
                      onClick={() => navigate('/elections/new')}
                      className="btn-primary px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      New Election
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recentElections.map((election) => (
                  <div
                    key={election._id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {election.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ends: {new Date(election.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{election.candidates?.length || 0} candidates
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={election.status} />
                      <Link
                        to={`/elections/${election._id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
