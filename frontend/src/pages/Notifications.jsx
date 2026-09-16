import { useState, useEffect, useCallback } from 'react';
import { Bell, Vote, CheckCircle2, UserCheck, BadgeCheck, ShieldAlert, CalendarClock, BellOff, CheckCheck, Loader2, Trash2, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const typeConfig = {
  election_created: { icon: Vote, color: 'bg-indigo-50 text-indigo-600' },
  election_starting: { icon: CalendarClock, color: 'bg-amber-50 text-amber-600' },
  election_ending: { icon: CalendarClock, color: 'bg-orange-50 text-orange-600' },
  vote_confirmation: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  candidate_approval: { icon: UserCheck, color: 'bg-blue-50 text-blue-600' },
  account_verification: { icon: BadgeCheck, color: 'bg-teal-50 text-teal-600' },
  security_alert: { icon: ShieldAlert, color: 'bg-red-50 text-red-600' },
  general: { icon: Bell, color: 'bg-gray-100 text-gray-500' },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const d = new Date(dateStr);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsAPI.getAll();
      setNotifs(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifs((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    setClearingAll(true);
    try {
      await notificationsAPI.clearAll();
      setNotifs([]);
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear notifications');
    } finally {
      setClearingAll(false);
    }
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · ${notifs.length} total`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              disabled={markingAll || unreadCount === 0}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {markingAll ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
              Mark all read
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearingAll || notifs.length === 0}
              className="btn-secondary inline-flex items-center gap-2 text-red-600 disabled:opacity-50"
            >
              {clearingAll ? <Loader2 size={15} className="animate-spin" /> : <Trash size={15} />}
              Clear all
            </button>
          </div>
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifs} />
      ) : notifs.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications yet"
          description="You will see election updates, vote confirmations and security alerts here."
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {notifs.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.general;
            const Icon = cfg.icon;
            return (
              <div
                key={n._id}
                className={`group w-full flex items-start gap-4 px-5 py-4 transition-colors ${!n.isRead ? 'bg-primary-50/40 hover:bg-primary-50/70' : 'hover:bg-gray-50/60'}`}
              >
                <button
                  onClick={() => handleMarkRead(n._id)}
                  className="flex items-start gap-4 text-left flex-1 min-w-0"
                >
                  <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(n._id)}
                  title="Delete notification"
                  className="self-center p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 size={15} />
                </button>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-6" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}