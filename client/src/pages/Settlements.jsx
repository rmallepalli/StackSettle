import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
         subMonths, subQuarters } from 'date-fns'
import toast from 'react-hot-toast'
import { calculateSettlement, saveSettlement, getSettlements } from '../services/settlements.js'
import useFetch from '../hooks/useFetch.js'
import EmptyState from '../components/EmptyState.jsx'
import CurrencyDisplay from '../components/CurrencyDisplay.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { PageSpinner } from '../components/Spinner.jsx'

// ─────────────────────────────────────────────────────────────
// Period presets
// ─────────────────────────────────────────────────────────────
const today = new Date()

const PRESETS = [
  {
    label: 'This month',
    dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
    dateTo:   format(endOfMonth(today),   'yyyy-MM-dd'),
  },
  {
    label: 'Last month',
    dateFrom: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
    dateTo:   format(endOfMonth(subMonths(today, 1)),   'yyyy-MM-dd'),
  },
  {
    label: 'This quarter',
    dateFrom: format(startOfQuarter(today), 'yyyy-MM-dd'),
    dateTo:   format(endOfQuarter(today),   'yyyy-MM-dd'),
  },
  {
    label: 'Last quarter',
    dateFrom: format(startOfQuarter(subQuarters(today, 1)), 'yyyy-MM-dd'),
    dateTo:   format(endOfQuarter(subQuarters(today, 1)),   'yyyy-MM-dd'),
  },
  { label: 'All time', dateFrom: '', dateTo: '' },
  { label: 'Custom…',  dateFrom: null, dateTo: null },   // null = show inputs
]

// ─────────────────────────────────────────────────────────────
export default function Settlements() {
  const [activeTab, setActiveTab] = useState('calculate') // 'calculate' | 'history'

  return (
    <>
      <div className="sticky top-14 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 pt-4 pb-0 flex items-center">
          <h1 className="text-xl font-bold text-gray-900 flex-1">Settlements</h1>
        </div>
        {/* Tabs */}
        <div className="flex px-4 mt-2">
          {[['calculate','Calculate'],['history','History']].map(([val, label]) => (
            <button key={val} onClick={() => setActiveTab(val)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === val
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'calculate' ? <CalculateTab /> : <HistoryTab />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Calculate tab
// ─────────────────────────────────────────────────────────────
function CalculateTab() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [calculating, setCalculating] = useState(false)
  const [result,      setResult]      = useState(null)  // { transactions, games, playerSummary }
  const [checkedGames, setCheckedGames] = useState(new Set())
  const [recalcNeeded, setRecalcNeeded] = useState(false)
  const [settleConfirm, setSettleConfirm] = useState(false)
  const [settling, setSettling] = useState(false)

  const preset = PRESETS[selectedPreset]
  const isCustom = preset.dateFrom === null

  const dateFrom = isCustom ? customFrom : preset.dateFrom
  const dateTo   = isCustom ? customTo   : preset.dateTo

  // ── Calculate ──────────────────────────────
  const handleCalculate = async () => {
    setCalculating(true)
    setResult(null)
    setRecalcNeeded(false)
    try {
      const data = await calculateSettlement({ dateFrom: dateFrom||undefined, dateTo: dateTo||undefined })
      setResult(data)
      setCheckedGames(new Set(data.games.map((g) => g.game_id)))
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to calculate')
    } finally {
      setCalculating(false)
    }
  }

  // ── Toggle game selection ─────────────────
  const toggleGame = (id) => {
    setCheckedGames((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setRecalcNeeded(true)
  }

  // ── Recalculate with subset of games ──────
  const handleRecalculate = async () => {
    if (!checkedGames.size) return toast.error('Select at least one game')
    setCalculating(true)
    setRecalcNeeded(false)
    try {
      const data = await calculateSettlement({ gameIds: [...checkedGames] })
      setResult((prev) => ({ ...prev, transactions: data.transactions, playerSummary: data.playerSummary }))
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to recalculate')
    } finally {
      setCalculating(false)
    }
  }

  // ── Settle up ─────────────────────────────
  const handleSettle = async () => {
    setSettling(true)
    try {
      await saveSettlement({
        transactions: result.transactions,
        gameIds: [...checkedGames],
        periodStart: dateFrom || null,
        periodEnd:   dateTo   || null,
      })
      toast.success('Settled! Games marked as settled.')
      setSettleConfirm(false)
      setResult(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to settle')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* ── Period selector ─────────────────── */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Select Period</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setSelectedPreset(i)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                selectedPreset === i
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {isCustom && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="label">From</label>
              <input type="date" className="input py-2" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input py-2" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        <button className="btn-primary w-full py-3" onClick={handleCalculate} disabled={calculating}>
          {calculating ? 'Calculating…' : 'Calculate Settlement'}
        </button>
      </section>

      {/* ── Results ─────────────────────────── */}
      {calculating && <PageSpinner />}

      {result && !calculating && (
        <>
          {result.games.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All settled up!"
              description="No finalized, unsettled games found in this period."
            />
          ) : (
            <>
              {/* Games included */}
              <GamesSection
                games={result.games}
                checkedGames={checkedGames}
                onToggle={toggleGame}
              />

              {recalcNeeded && (
                <button className="btn-secondary w-full py-2.5 text-sm border-green-200 text-green-700"
                  onClick={handleRecalculate} disabled={calculating}>
                  Recalculate with selected games
                </button>
              )}

              {/* Player summary */}
              <PlayerSummarySection summary={result.playerSummary} />

              {/* Payment instructions */}
              <PaymentInstructionsSection transactions={result.transactions} />

              {/* Settle up */}
              {result.transactions.length > 0 && (
                <button className="btn-primary w-full py-4 text-base"
                  onClick={() => setSettleConfirm(true)}>
                  Mark as Settled
                </button>
              )}

              {result.transactions.length === 0 && result.games.length > 0 && (
                <div className="card bg-green-50 border-green-200 text-center py-4">
                  <p className="text-sm font-semibold text-green-800">Everyone is even!</p>
                  <p className="text-xs text-green-600 mt-1">No payments needed for this period.</p>
                  <button className="mt-3 btn-primary py-2 px-5 text-sm"
                    onClick={() => setSettleConfirm(true)}>
                    Mark Games as Settled
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Settle confirm */}
      <ConfirmDialog
        open={settleConfirm}
        title="Mark as settled?"
        message={`This will mark ${checkedGames.size} game${checkedGames.size !== 1 ? 's' : ''} as settled and record the payment transactions. This can't be undone.`}
        confirmLabel="Settle Up"
        loading={settling}
        onConfirm={handleSettle}
        onCancel={() => setSettleConfirm(false)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Games included section
// ─────────────────────────────────────────────────────────────
function GamesSection({ games, checkedGames, onToggle }) {
  return (
    <section>
      <h2 className="font-semibold text-gray-900 text-sm mb-2">
        Games Included
        <span className="ml-2 text-gray-400 font-normal">
          {checkedGames.size} of {games.length} selected
        </span>
      </h2>
      <div className="card py-0 divide-y divide-gray-50">
        {games.map((g) => {
          const checked = checkedGames.has(g.game_id)
          return (
            <button key={g.game_id} onClick={() => onToggle(g.game_id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                checked ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{g.host_name}'s Game</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(g.game_date), 'MMM d, yyyy')}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Player net summary
// ─────────────────────────────────────────────────────────────
function PlayerSummarySection({ summary }) {
  const sorted = [...summary].sort((a, b) => b.net_total - a.net_total)

  return (
    <section>
      <h2 className="font-semibold text-gray-900 text-sm mb-2">Player Totals</h2>
      <div className="card py-0 divide-y divide-gray-50">
        {sorted.map((p) => (
          <PlayerSummaryRow key={p.player_id} player={p} />
        ))}
      </div>
    </section>
  )
}

function PlayerSummaryRow({ player }) {
  const [expanded, setExpanded] = useState(false)
  const net = player.net_total

  return (
    <div>
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase
          ${net > 0 ? 'bg-green-100 text-green-700' : net < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
          {player.player_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{player.player_name}</p>
          <p className="text-xs text-gray-400">{player.games.length} game{player.games.length !== 1 ? 's' : ''}</p>
        </div>
        <CurrencyDisplay amount={net} netMode className="text-sm" />
        <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-gray-50 px-4 py-2 space-y-1.5 border-t border-gray-100">
          {player.games.map((g) => (
            <div key={g.game_id} className="flex justify-between text-xs">
              <span className="text-gray-500">{format(new Date(g.game_date), 'MMM d, yyyy')}</span>
              <CurrencyDisplay amount={g.net_result} netMode className="text-xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Payment instructions (debt-minimized)
// ─────────────────────────────────────────────────────────────
function PaymentInstructionsSection({ transactions }) {
  if (!transactions.length) return null

  return (
    <section>
      <h2 className="font-semibold text-gray-900 text-sm mb-2">
        Payment Instructions
        <span className="ml-2 text-xs font-normal text-gray-400">
          {transactions.length} transfer{transactions.length !== 1 ? 's' : ''}
        </span>
      </h2>
      <div className="space-y-2">
        {transactions.map((tx, i) => (
          <PaymentCard key={i} tx={tx} />
        ))}
      </div>
    </section>
  )
}

function PaymentCard({ tx }) {
  const [expanded, setExpanded] = useState(false)

  const paymentMethods = [
    tx.to_venmo  && { label: 'Venmo',    value: tx.to_venmo,  color: 'text-blue-600',   bg: 'bg-blue-50' },
    tx.to_cashapp && { label: 'Cash App', value: tx.to_cashapp, color: 'text-green-600', bg: 'bg-green-50' },
    tx.to_zelle  && { label: 'Zelle',    value: tx.to_zelle,  color: 'text-purple-600', bg: 'bg-purple-50' },
    tx.to_paypal && { label: 'PayPal',   value: tx.to_paypal, color: 'text-sky-600',    bg: 'bg-sky-50' },
    tx.to_other  && { label: 'Other',    value: tx.to_other,  color: 'text-gray-600',   bg: 'bg-gray-50' },
  ].filter(Boolean)

  return (
    <div className="card overflow-hidden py-0">
      {/* Main row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* From avatar */}
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-xs
                        flex items-center justify-center shrink-0 uppercase">
          {tx.from_name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            <span className="text-red-600">{tx.from_name}</span>
            <span className="text-gray-400 font-normal mx-1.5">pays</span>
            <span className="text-green-600">{tx.to_name}</span>
          </p>
          {paymentMethods.length > 0 && (
            <p className="text-xs text-gray-400">via {paymentMethods.map(m=>m.label).join(' · ')}</p>
          )}
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900">${tx.amount.toFixed(2)}</p>
        </div>

        {/* Expand for payment details */}
        {paymentMethods.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="text-gray-300 active:text-gray-600 p-1 shrink-0">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Payment details */}
      {expanded && paymentMethods.length > 0 && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Send to {tx.to_name} via:</p>
          {paymentMethods.map((m) => (
            <div key={m.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${m.bg}`}>
              <span className={`text-xs font-semibold ${m.color} w-16 shrink-0`}>{m.label}</span>
              <span className="text-sm font-medium text-gray-900 flex-1 break-all">{m.value}</span>
              <CopyButton text={m.value} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available (non-https)
    }
  }
  return (
    <button onClick={handleCopy}
      className="text-xs text-gray-400 active:text-gray-600 shrink-0 px-2 py-1 rounded-lg active:bg-white/60">
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// History tab
// ─────────────────────────────────────────────────────────────
function HistoryTab() {
  const { data: history, loading, error, refetch } = useFetch(getSettlements)

  if (loading) return <PageSpinner />
  if (error)   return (
    <div className="px-4 pt-6">
      <button className="btn-secondary w-full" onClick={refetch}>Retry</button>
    </div>
  )

  if (!history?.length) return (
    <EmptyState
      icon="📋"
      title="No settlement history"
      description="Completed settlements will appear here."
    />
  )

  // Group by created_at date
  const groups = {}
  for (const s of history) {
    const key = format(new Date(s.created_at), 'MMMM yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {Object.entries(groups).map(([month, items]) => (
        <section key={month}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{month}</h2>
          <div className="card py-0 divide-y divide-gray-50">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-red-600">{s.from_name}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="text-green-600">{s.to_name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(s.created_at), 'MMM d, yyyy')}
                    {s.game_ids?.length > 0 && ` · ${s.game_ids.length} game${s.game_ids.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900 shrink-0">
                  ${parseFloat(s.amount).toFixed(2)}
                </span>
                <span className="badge-gray">Settled</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
