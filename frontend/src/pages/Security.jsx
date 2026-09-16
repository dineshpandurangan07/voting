import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Skull,
  Ban,
  Globe,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { securityAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';

const SEVERITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False Positive' },
];

const EVENT_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False Positive' },
];

const STATUS_BAR_COLORS = {
  new: 'bg-blue-500',
  under_review: 'bg-amber-500',
  resolved: 'bg-emerald-500',
  false_positive: 'bg-gray-400',
};

const SEVERITY_BAR_COLORS = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

const formatDateTime = (iso) => {
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

const riskColor = (score) => {
  const s = Number(score) || 0;
  if (s >= 70) return 'text-red-600';
  if (s >= 40) return 'text-amber-600';
  return 'text-emerald-600';
};

function BreakdownBars({ title, data, colorMap, icon: Icon }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon size={18} className="text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-sm text-gray-400">No data available yet.</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="card">
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon size={18} className="text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-4">
          {data.map((d) => (
            <div key={d._id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {String(d._id).replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-gray-500">{d.count}</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colorMap[d._id] || 'bg-gray-400'} transition-all duration-500`}
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Security() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [anomalyReport, setAnomalyReport] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await securityAPI.getOverview();
      setOverview(res.data.data);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    try {
      const res = await securityAPI.getAnomalies();
      setAnomalyReport(res.data.data);
    } catch {
      setAnomalyReport(null);
    } finally {
      setAnomalyLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100 };
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await securityAPI.getEvents(params);
      setEvents(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    fetchOverview();
    fetchAnomalies();
  }, [fetchOverview, fetchAnomalies]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleStatusChange = async (eventId, status) => {
    const previous = events;
    setEvents((prev) =>
      prev.map((e) => (e._id === eventId ? { ...e, status } : e))
    );
    try {
      await securityAPI.updateEvent(eventId, { status });
      toast.success('Event status updated');
    } catch (err) {
      setEvents(previous);
      toast.error(err.response?.data?.message || 'Failed to update event status');
    }
  };

  const highestRiskEvent =
    events.length > 0
      ? events.reduce((max, e) => (Number(e.riskScore) > Number(max.riskScore) ? e : max), events[0])
      : null;

  const topAnomaly = anomalyReport?.anomalies?.[0] || null;
  const displayed = topAnomaly || highestRiskEvent;
  const aiLoading = anomalyLoading || loading;

  const statsCards = [
    { icon: ShieldAlert, title: 'Failed Login Attempts', value: overview?.failedLogins },
    { icon: AlertTriangle, title: 'Suspicious Activities', value: overview?.suspiciousActivities },
    { icon: Skull, title: 'High Risk Events', value: overview?.highRiskEvents },
    { icon: Ban, title: 'Blocked Requests', value: overview?.blockedRequests },
  ];

  const columns = [
    {
      key: 'event',
      header: 'Event',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">
            {String(row.event || 'Security event').replace(/_/g, ' ')}
          </p>
          {row.action && <p className="text-xs text-gray-500 mt-0.5 capitalize">{row.action}</p>}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) =>
        row.user ? (
          <div>
            <p className="text-gray-700">{row.user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{row.user.email}</p>
          </div>
        ) : (
          <span className="text-gray-400">System</span>
        ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <StatusBadge status={row.severity} />,
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      render: (row) => (
        <span className={`font-bold ${riskColor(row.riskScore)}`}>
          {Number(row.riskScore) || 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (row) => <span className="text-gray-600">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row._id, e.target.value)}
          className="input-field w-40 py-1.5 text-xs"
        >
          {EVENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Center"
        subtitle="Monitor security threats and suspicious activity"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            loading={overviewLoading}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={Globe}
          title="Active Sessions"
          value={overview?.activeSessions}
          loading={overviewLoading}
        />
        <StatsCard
          icon={AlertTriangle}
          title="AI Overall Risk"
          value={anomalyReport?.summary?.overallRisk ?? '—'}
          trend={anomalyReport?.summary?.high ? `${anomalyReport.summary.high} high` : undefined}
          trendColor={anomalyReport?.summary?.high ? 'red' : 'green'}
          subtitle="Anomaly engine score"
          loading={anomalyLoading}
        />
        <StatsCard
          icon={Skull}
          title="AI Anomalies Found"
          value={anomalyReport?.summary?.totalFindings ?? '—'}
          trend={anomalyReport?.summary?.engine?.split(' ')[0] ?? undefined}
          subtitle={anomalyReport?.summary?.engine}
          loading={anomalyLoading}
        />
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            AI Anomaly Detection
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Automated analysis of system activity to surface unusual behavior
          </p>
        </div>
        <div className="p-6">
          {aiLoading ? (
            <div className="py-10 flex items-center justify-center">
              <span className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></span>
            </div>
          ) : displayed ? (
            <div className="border border-amber-300 bg-amber-50/50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-amber-900">Suspicious Activity Detected</h4>
                  <StatusBadge status={displayed.severity} />
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Risk Score:</span>{' '}
                  <span className="font-bold">{Number(displayed.riskScore) || 0}</span>{' '}
                  <span className="text-gray-400">/ 100</span>
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  <span className="font-semibold">Reason:</span>{' '}
                  {displayed.reason || displayed.description || 'No description provided'}
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  <span className="font-semibold">Status:</span>{' '}
                  <span className="capitalize">{String(displayed.status || 'new').replace(/_/g, ' ')}</span>
                </p>
                {displayed.user && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-semibold">Flagged Account:</span>{' '}
                    {displayed.user.name} ({displayed.user.email})
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-amber-400 bg-white">
                  <span className="text-xl font-bold text-amber-700">
                    {Number(displayed.riskScore) || 0}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 mt-1.5">
                  Overall {anomalyReport?.summary?.overallRisk ?? '—'}/100
                </span>
              </div>
            </div>
          ) : (
            <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900">No anomalies detected</h4>
                <p className="text-sm text-gray-700 mt-0.5">
                  System running normally — no suspicious activity in the current view.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BreakdownBars
          title="Status Breakdown"
          data={overview?.statusBreakdown}
          colorMap={STATUS_BAR_COLORS}
          icon={ShieldCheck}
        />
        <BreakdownBars
          title="Severity Breakdown"
          data={overview?.severityBreakdown}
          colorMap={SEVERITY_BAR_COLORS}
          icon={AlertTriangle}
        />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input-field sm:w-44"
              aria-label="Severity filter"
            >
              {SEVERITY_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-48"
              aria-label="Status filter"
            >
              {STATUS_FILTERS.map((opt) => (
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
            data={events}
            loading={loading}
            error={error}
            onRetry={fetchEvents}
            rowKey="_id"
            emptyTitle="No security events"
            emptyDescription={
              severityFilter !== 'all' || statusFilter !== 'all'
                ? 'No events match the current filters. Try adjusting them.'
                : 'No security events detected. The system is running normally.'
            }
            emptyIcon={ShieldCheck}
          />
        </div>
      </div>
    </div>
  );
}

export default Security;