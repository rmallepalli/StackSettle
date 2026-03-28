import { useEffect } from 'react'

/**
 * Full-screen slide-up modal — works great on mobile.
 * Usage:
 *   <Modal title="Edit Player" open={show} onClose={() => setShow(false)}>
 *     ...content...
 *   </Modal>
 */
export default function Modal({ open, onClose, title, children, footer }) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          {/* Drag handle on mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 active:text-gray-600 p-1 -mr-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="border-t border-gray-100 px-4 py-3 shrink-0 safe-area-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
