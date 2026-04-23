import { useNavigate } from 'react-router-dom'

/**
 * Reusable page header with optional back button and right-side action.
 */
export default function PageHeader({ title, backTo, action }) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-[57px] bg-slate-900/95 backdrop-blur-sm z-10 px-4 py-3 flex items-center gap-3 border-b border-slate-700">
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="text-slate-500 active:text-slate-300 -ml-1 p-1"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold text-slate-100 truncate">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
