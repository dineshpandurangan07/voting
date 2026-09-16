import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ message = 'Error loading data', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
        <AlertCircle size={26} />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">Something went wrong</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}