/**
 * Shows compact payment method pills for a player.
 * Renders only the ones that are filled in.
 */
const METHODS = [
  { key: 'venmo_handle',  label: 'Venmo',    color: 'bg-blue-100 text-blue-700' },
  { key: 'cashapp_tag',   label: 'Cash App', color: 'bg-green-100 text-green-700' },
  { key: 'zelle_contact', label: 'Zelle',    color: 'bg-purple-100 text-purple-700' },
  { key: 'paypal_handle', label: 'PayPal',   color: 'bg-sky-100 text-sky-700' },
  { key: 'other_payment', label: 'Other',    color: 'bg-gray-100 text-gray-600' },
]

export default function PaymentBadges({ player }) {
  const active = METHODS.filter((m) => player[m.key])
  if (!active.length) return <span className="text-xs text-gray-400">No payment info</span>

  return (
    <div className="flex flex-wrap gap-1">
      {active.map((m) => (
        <span key={m.key} className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.color}`}>
          {m.label}
        </span>
      ))}
    </div>
  )
}
