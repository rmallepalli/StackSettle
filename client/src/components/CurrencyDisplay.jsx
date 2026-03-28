/**
 * Renders a dollar amount with green/red colouring for net results.
 * netMode: if true, positive = green, negative = red, zero = gray.
 */
export default function CurrencyDisplay({ amount, netMode = false, className = '' }) {
  const val = parseFloat(amount) || 0
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(val))

  const display = netMode && val > 0 ? `+${formatted}` : netMode && val < 0 ? `-${formatted}` : formatted

  let colorClass = ''
  if (netMode) {
    if (val > 0) colorClass = 'text-green-600'
    else if (val < 0) colorClass = 'text-red-600'
    else colorClass = 'text-gray-400'
  }

  return <span className={`font-semibold tabular-nums ${colorClass} ${className}`}>{display}</span>
}
