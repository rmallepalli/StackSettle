const STYLES = {
  open:      'badge-yellow',
  finalized: 'badge-green',
  settled:   'badge-gray',
  pending:   'badge-yellow',
}

const LABELS = {
  open:      'Open',
  finalized: 'Finalized',
  settled:   'Settled',
  pending:   'Pending',
}

export default function StatusBadge({ status }) {
  return (
    <span className={STYLES[status] || 'badge-gray'}>
      {LABELS[status] || status}
    </span>
  )
}
