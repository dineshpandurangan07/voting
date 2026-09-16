import Loading from './Loading';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

export default function DataTable({ columns, data, loading, error, onRetry, emptyTitle, emptyDescription, emptyIcon, rowKey = '_id' }) {
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message || 'Failed to load data'} onRetry={onRetry} />;
  if (!data || data.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key || col.header} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr key={row[rowKey] || idx} className="hover:bg-gray-50/60 transition-colors">
                {columns.map((col) => (
                  <td key={col.key || col.header} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}