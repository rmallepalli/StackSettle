/**
 * Shows compact payment method pills for a player.
 * Renders only the ones that are filled in.
 */
const METHODS = [
  { key: 'venmo_handle',  label: 'Venmo',    color: 'bg-blue-900/40 text-blue-400' },
  { key: 'cashapp_tag',   label: 'Cash App', color: 'bg-emerald-900/40 text-emerald-400' },
  { key: 'zelle_contact', label: 'Zelle',    color: 'bg-purple-900/40 text-purple-400' },
  { key: 'paypal_handle', label: 'PayPal',   color: 'bg-sky-900/40 text-sky-400' },
  { key: 'other_payment', label: 'Other',    color: 'bg-slate-700 text-slate-300' },
]

export default function PaymentBadges({ player }) {
  const active = METHODS.filter((m) => player[m.key])
  if (!active.length) return <span className="text-xs text-slate-500">No payment info</span>

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
