import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vote, CalendarClock, CheckCircle2, History, Bell, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { electionsAPI, votesAPI, notificationsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

function VoterDashboard() {
  const { user } = useAuth();

  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [ended, setEnded] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionsRes, historyRes, notifRes] = await Promise.all([
        electionsAPI.getAll(),
        votesAPI.getHistory(),
        notificationsAPI.getAll(),
      ]);

      const all = electionsRes.data.data;
      setOngoing(all.filter((e) => e.status === 'ongoing'));
      setUpcoming(all.filter((e) => e.status === 'scheduled' || e.status === 'draft'));
      setEnded(all.filter((e) => e.status === 'ended'));
      setHistory(historyRes.data.data);
      setNotifications(notifRes.data.data.slice(0, 5));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatDateTime = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) return <Loading text="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Voting Dashboard"
        subtitle={`Welcome, ${user?.name}!`}
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span>Verified Voter</span>
          </div>
        }
      />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Vote className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Active Elections</h2>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {ongoing.length}
          </span>
        </div>
        {ongoing.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="No active elections"
            description="There are no ongoing elections at the moment. Check back soon!"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {ongoing.map((election) => (
              <div key={election._id} className="card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-gray-900 leading-tight">
                      {election.name}
                    </h3>
                    <StatusBadge status={election.status} />
                  </div>
                  {election.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {election.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Ends: {formatDate(election.endDate)}
                    </span>
                    <span>{election.eligibleVoters?.length || 0} eligible voters</span>
                  </div>
                </div>
                <Link
                  to={`/elections/${election._id}/vote`}
                  className="mt-4 btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Cast Your Vote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Elections</h2>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming elections"
            description="There are no scheduled elections at this time."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map((election) => (
              <div key={election._id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {election.name}
                  </h3>
                  <StatusBadge status={election.status} />
                </div>
                {election.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {election.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Starts: {formatDate(election.startDate)}
                  </span>
                  <span>{election.eligibleVoters?.length || 0} eligible voters</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Completed Elections</h2>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {ended.length}
          </span>
        </div>
        {ended.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No completed elections"
            description="Completed elections will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {ended.map((election) => (
              <div key={election._id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {election.name}
                  </h3>
                  <StatusBadge status={election.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Ended: {formatDate(election.endDate)}</span>
                  <span>{election.totalVotes || 0} votes cast</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Voting History</h2>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No voting history"
            description="You haven't cast any votes yet. Participate in an active election!"
          />
        ) : (
          <div className="space-y-3">
            {history.map((vote) => (
              <div key={vote._id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {vote.election?.name || 'Unknown Election'}
                    </span>
                    <StatusBadge status={vote.election?.status || 'unknown'} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Voted for <span className="font-medium text-gray-700">{vote.candidate?.name || 'N/A'}</span>
                    {vote.candidate?.party ? ` (${vote.candidate.party})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 whitespace-nowrap">
                  <span>Receipt: {vote.receiptId}</span>
                  <span>{formatDateTime(vote.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up!"
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif._id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {timeAgo(notif.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default VoterDashboard;
