import Modal from './Modal.jsx'

/**
 * Simple yes/no confirmation modal.
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete player?"
 *     message="This can't be undone."
 *     confirmLabel="Delete"
 *     danger
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm',
  danger = false, onConfirm, onCancel, loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  )
}
