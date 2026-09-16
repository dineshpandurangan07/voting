import { motion } from 'framer-motion';

export default function StatsCard({ icon: Icon, title, value, trend, subtitle, trendColor = 'green', loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-5 flex items-start justify-between"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          {trend && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${trendColor === 'red' ? 'text-red-600 bg-red-50' : trendColor === 'blue' ? 'text-blue-600 bg-blue-50' : trendColor === 'amber' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
              {trend}
            </span>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 ml-3">
          <Icon size={22} />
        </div>
      )}
    </motion.div>
  );
}