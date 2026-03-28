/**
 * Reusable player form — used in both the create and edit modals.
 * `data` / `onChange` are controlled externally.
 */
export default function PlayerForm({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange({ ...data, [name]: e.target.value }),
  })

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div>
        <label className="label">Name <span className="text-red-500">*</span></label>
        <input className="input" placeholder="Full name" autoFocus {...field('name')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input className="input" type="tel" placeholder="555-0100" {...field('phone')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="player@email.com" {...field('email')} />
        </div>
      </div>

      {/* Payment methods */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Payment Methods
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 font-medium shrink-0">Venmo</span>
            <input className="input" placeholder="@username" {...field('venmo_handle')} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 font-medium shrink-0">Zelle</span>
            <input className="input" placeholder="Phone or email" {...field('zelle_contact')} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 font-medium shrink-0">PayPal</span>
            <input className="input" placeholder="paypal.me/username" {...field('paypal_handle')} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 font-medium shrink-0">Cash App</span>
            <input className="input" placeholder="$cashtag" {...field('cashapp_tag')} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs text-gray-500 font-medium shrink-0">Other</span>
            <input className="input" placeholder="e.g. Venmo @other or check" {...field('other_payment')} />
          </div>
        </div>
      </div>
    </div>
  )
}
