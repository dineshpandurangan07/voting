const styles = {
  ongoing: 'bg-green-50 text-green-700 border-green-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  ended: 'bg-gray-100 text-gray-600 border-gray-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-purple-50 text-purple-700 border-purple-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  unverified: 'bg-amber-50 text-amber-700 border-amber-200',
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  false_positive: 'bg-gray-100 text-gray-500 border-gray-200',
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-800 border-red-300',
  true: 'bg-green-50 text-green-700 border-green-200',
  false: 'bg-gray-100 text-gray-600 border-gray-200',
  read: 'bg-gray-100 text-gray-500 border-gray-200',
  unread: 'bg-blue-50 text-blue-700 border-blue-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function StatusBadge({ status, className = '' }) {
  const normalized = String(status || '').replace(/\s+/g, '_').toLowerCase();
  const style = styles[normalized] || styles.default;
  const label = String(status || 'Unknown')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {label}
    </span>
  );
}