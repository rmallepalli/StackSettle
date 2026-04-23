export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-sm text-slate-400 mb-4">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button className="btn-secondary text-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
