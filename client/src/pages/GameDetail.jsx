import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  getGame, addPlayerToGame, removePlayerFromGame,
  addTransaction, deleteTransaction, finalizeGame, deleteGame,
  updatePlayerResult, bulkUpdateStacks,
} from '../services/games.js'
import { getPlayers } from '../services/players.js'
import useFetch from '../hooks/useFetch.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import CurrencyDisplay from '../components/CurrencyDisplay.jsx'
import PlayerSelectModal from '../components/PlayerSelectModal.jsx'
import PlayerForm from '../components/PlayerForm.jsx'
import { PageSpinner } from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

// ─────────────────────────────────────────────────────────────
export default function GameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: game, loading, error, refetch } = useFetch(() => getGame(id), [id])
  const { data: allPlayers, loading: playersLoading } = useFetch(getPlayers)

  // Modal state
  const [txModal, setTxModal]           = useState(null)   // { player } — buy/rebuy modal
  const [addPlayerModal, setAddPlayerModal] = useState(false)
  const [newPlayerModal, setNewPlayerModal] = useState(false)
  const [stacksModal, setStacksModal]   = useState(false)
  const [finalizeConfirm, setFinalizeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm]     = useState(false)

  // New-player-on-the-fly form
  const EMPTY = { name:'',phone:'',email:'',venmo_handle:'',zelle_contact:'',paypal_handle:'',cashapp_tag:'',other_payment:'' }
  const [newPlayerForm, setNewPlayerForm] = useState(EMPTY)

  // Buy/rebuy form
  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType]     = useState('buy')
  const [txSaving, setTxSaving] = useState(false)

  // Stacks form: { [playerId]: endingStack string }
  const [stacks, setStacks]     = useState({})
  const [stacksSaving, setStacksSaving] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  if (loading) return <PageSpinner />
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />
  if (!game)   return null

  const isOpen      = game.status === 'open'
  const isFinalized = game.status === 'finalized'
  const isSettled   = game.status === 'settled'
  const isLocked    = isFinalized || isSettled

  const totalPot    = game.players.reduce((s, p) => s + parseFloat(p.buy_in_total || 0), 0)
  const existingIds = game.players.map((p) => p.player_id)
  const dateStr     = game.game_date ? format(new Date(game.game_date), 'EEE, MMM d, yyyy') : '—'

  // ── Handlers ────────────────────────────────────────────

  const handleAddExistingPlayer = async (player) => {
    try {
      await addPlayerToGame(game.id, { player_id: player.id })
      toast.success(`${player.name} added`)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    }
  }

  const handleAddNewPlayer = async () => {
    if (!newPlayerForm.name.trim()) return toast.error('Name is required')
    setActionLoading(true)
    try {
      await addPlayerToGame(game.id, newPlayerForm)
      toast.success(`${newPlayerForm.name} added`)
      setNewPlayerModal(false)
      setNewPlayerForm(EMPTY)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemovePlayer = async (player) => {
    if (parseFloat(player.buy_in_total) > 0) {
      return toast.error('Cannot remove a player with buy-ins recorded')
    }
    try {
      await removePlayerFromGame(game.id, player.player_id)
      toast.success(`${player.name} removed`)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove player')
    }
  }

  const openTxModal = (player) => {
    setTxAmount('')
    setTxType(parseFloat(player.buy_in_total) === 0 ? 'buy' : 'rebuy')
    setTxModal(player)
  }

  const handleAddTx = async () => {
    const amt = parseFloat(txAmount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    setTxSaving(true)
    try {
      await addTransaction(game.id, { player_id: txModal.player_id, amount: amt, type: txType })
      toast.success(`${txType === 'buy' ? 'Buy-in' : 'Rebuy'} recorded`)
      setTxModal(null)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to record transaction')
    } finally {
      setTxSaving(false)
    }
  }

  const handleDeleteTx = async (txId) => {
    try {
      await deleteTransaction(txId)
      toast.success('Transaction removed')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove transaction')
    }
  }

  // ── Ending stacks ─────────────────────────────────────
  const openStacksModal = () => {
    const init = {}
    game.players.forEach((p) => {
      init[p.player_id] = p.ending_stack != null ? String(p.ending_stack) : ''
    })
    setStacks(init)
    setStacksModal(true)
  }

  const handleSaveStacks = async () => {
    const payload = game.players
      .map((p) => ({ player_id: p.player_id, ending_stack: parseFloat(stacks[p.player_id]) || 0 }))
      .filter((p) => stacks[p.player_id] !== '')

    if (!payload.length) return toast.error('Enter at least one stack')

    // Verify pot balance
    const stackTotal = payload.reduce((s, p) => s + p.ending_stack, 0)
    const diff = Math.abs(stackTotal - totalPot)
    if (diff > 0.01) {
      toast.error(`Stacks total $${stackTotal.toFixed(2)} but pot is $${totalPot.toFixed(2)} (Δ $${diff.toFixed(2)})`)
      return
    }

    setStacksSaving(true)
    try {
      await bulkUpdateStacks(game.id, payload)
      toast.success('Stacks saved')
      setStacksModal(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save stacks')
    } finally {
      setStacksSaving(false)
    }
  }

  // ── Finalize ──────────────────────────────────────────
  const handleFinalize = async () => {
    const missing = game.players.filter((p) => p.ending_stack == null)
    if (missing.length) {
      toast.error(`Missing stack for: ${missing.map((p) => p.name).join(', ')}`)
      setFinalizeConfirm(false)
      return
    }
    setActionLoading(true)
    try {
      await finalizeGame(game.id)
      toast.success('Game finalized')
      setFinalizeConfirm(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to finalize')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await deleteGame(game.id)
      toast.success('Game deleted')
      navigate('/games')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot delete this game')
      setDeleteConfirm(false)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="sticky top-14 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/games')} className="text-gray-500 p-1 -ml-1 active:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{game.host_name}'s Game</h1>
          <p className="text-xs text-gray-500">{dateStr}</p>
        </div>
        <StatusBadge status={game.status} />
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Pot summary card */}
        <div className="card bg-green-600 text-white py-4">
          <p className="text-green-200 text-xs font-medium uppercase tracking-wider text-center">Total Pot</p>
          <p className="text-4xl font-bold text-center mt-1">
            ${totalPot.toFixed(2)}
          </p>
          <p className="text-green-200 text-xs text-center mt-1">
            {game.players.length} player{game.players.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Players */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 text-sm">Players</h2>
            {isOpen && (
              <div className="flex gap-2">
                <button
                  className="text-xs text-green-600 font-medium active:text-green-800"
                  onClick={() => setAddPlayerModal(true)}
                >
                  + Existing
                </button>
                <button
                  className="text-xs text-green-600 font-medium active:text-green-800"
                  onClick={() => { setNewPlayerForm(EMPTY); setNewPlayerModal(true) }}
                >
                  + New
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {game.players.map((p) => (
              <PlayerRow
                key={p.player_id}
                player={p}
                transactions={game.transactions.filter((t) => t.player_id === p.player_id)}
                isOpen={isOpen}
                isLocked={isLocked}
                onBuyRebuy={() => openTxModal(p)}
                onRemove={() => handleRemovePlayer(p)}
                onDeleteTx={handleDeleteTx}
              />
            ))}

            {game.players.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                No players yet.{isOpen && ' Add players above.'}
              </p>
            )}
          </div>
        </section>

        {/* Action buttons */}
        {isOpen && game.players.length > 0 && (
          <section className="space-y-2">
            <button
              className="btn-primary w-full py-3"
              onClick={openStacksModal}
            >
              Enter Ending Stacks
            </button>
            <button
              className="btn-secondary w-full py-3 text-green-700 border-green-200"
              onClick={() => setFinalizeConfirm(true)}
            >
              Finalize Game
            </button>
            <button
              className="text-red-500 text-sm w-full py-2 active:text-red-700"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete Game
            </button>
          </section>
        )}

        {isFinalized && (
          <div className="card bg-yellow-50 border-yellow-200 text-center py-4">
            <p className="text-sm font-medium text-yellow-800">Game Finalized</p>
            <p className="text-xs text-yellow-600 mt-1">
              Results are locked. Go to Settlements to settle up.
            </p>
          </div>
        )}

        {isSettled && (
          <div className="card bg-gray-50 border-gray-200 text-center py-4">
            <p className="text-sm font-medium text-gray-700">Game Settled</p>
            {game.settled_date && (
              <p className="text-xs text-gray-400 mt-1">
                Settled {format(new Date(game.settled_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {game.notes && (
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-700">{game.notes}</p>
          </div>
        )}
      </div>

      {/* ── Buy / Rebuy modal ────────────────────────── */}
      <Modal
        open={!!txModal}
        onClose={() => setTxModal(null)}
        title={`${txModal?.name}`}
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setTxModal(null)} disabled={txSaving}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddTx} disabled={txSaving}>
              {txSaving ? 'Saving…' : `Record ${txType === 'buy' ? 'Buy-in' : 'Rebuy'}`}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {['buy', 'rebuy'].map((t) => (
              <button
                key={t}
                onClick={() => setTxType(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  txType === t ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {t === 'buy' ? 'Buy-in' : 'Rebuy'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="1"
                step="5"
                className="input pl-7 text-lg font-semibold"
                placeholder="0"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {[20, 40, 50, 60, 100, 200].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTxAmount(String(amt))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    txAmount === String(amt)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Current total */}
          {txModal && (
            <p className="text-xs text-gray-400 text-center">
              Current total: <span className="font-semibold text-gray-700">
                ${parseFloat(txModal.buy_in_total || 0).toFixed(2)}
              </span>
            </p>
          )}
        </div>
      </Modal>

      {/* ── Enter ending stacks modal ────────────────── */}
      <Modal
        open={stacksModal}
        onClose={() => setStacksModal(false)}
        title="Enter Ending Stacks"
        footer={
          <div className="space-y-2">
            <StacksBalanceIndicator players={game.players} stacks={stacks} totalPot={totalPot} />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStacksModal(false)} disabled={stacksSaving}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={handleSaveStacks} disabled={stacksSaving}>
                {stacksSaving ? 'Saving…' : 'Save Stacks'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Enter each player's chip count. Total must equal the pot (${totalPot.toFixed(2)}).
          </p>
          {game.players.map((p) => (
            <div key={p.player_id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-xs
                              flex items-center justify-center shrink-0 uppercase">
                {p.name.charAt(0)}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">{p.name}</span>
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="input pl-6 pr-2 py-2 text-sm text-right"
                  placeholder="0"
                  value={stacks[p.player_id] ?? ''}
                  onChange={(e) => setStacks((prev) => ({ ...prev, [p.player_id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Add existing player modal ─────────────────── */}
      <PlayerSelectModal
        open={addPlayerModal}
        onClose={() => setAddPlayerModal(false)}
        players={allPlayers}
        loading={playersLoading}
        excludeIds={existingIds}
        onSelect={handleAddExistingPlayer}
      />

      {/* ── Add new player on-the-fly modal ──────────── */}
      <Modal
        open={newPlayerModal}
        onClose={() => setNewPlayerModal(false)}
        title="New Player"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setNewPlayerModal(false)} disabled={actionLoading}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddNewPlayer} disabled={actionLoading}>
              {actionLoading ? 'Adding…' : 'Add to Game'}
            </button>
          </div>
        }
      >
        <PlayerForm data={newPlayerForm} onChange={setNewPlayerForm} />
      </Modal>

      {/* ── Finalize confirm ──────────────────────────── */}
      <ConfirmDialog
        open={finalizeConfirm}
        title="Finalize game?"
        message="This locks the game results. You can still adjust individual amounts after finalizing, but no new buy-ins can be added."
        confirmLabel="Finalize"
        loading={actionLoading}
        onConfirm={handleFinalize}
        onCancel={() => setFinalizeConfirm(false)}
      />

      {/* ── Delete confirm ────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete game?"
        message="This will permanently delete the game and all its transactions. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// PlayerRow — one card per player in the game
// ─────────────────────────────────────────────────────────────
function PlayerRow({ player, transactions, isOpen, isLocked, onBuyRebuy, onRemove, onDeleteTx }) {
  const [expanded, setExpanded] = useState(false)
  const buyIn   = parseFloat(player.buy_in_total || 0)
  const stack   = player.ending_stack != null ? parseFloat(player.ending_stack) : null
  const adjusted = player.adjusted_amount != null ? parseFloat(player.adjusted_amount) : null
  const net     = player.net_result != null ? parseFloat(player.net_result) : null
  const hasResult = net != null

  return (
    <div className="card overflow-hidden py-0">
      {/* Main row */}
      <div className="flex items-center gap-3 py-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase
          ${hasResult
            ? net > 0 ? 'bg-green-100 text-green-700' : net < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            : 'bg-gray-100 text-gray-600'
          }`}>
          {player.name.charAt(0)}
        </div>

        {/* Name + buy-in */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{player.name}</p>
          <p className="text-xs text-gray-500">
            Bought in: <span className="font-medium">${buyIn.toFixed(2)}</span>
            {stack != null && (
              <> · Stack: <span className="font-medium">${(adjusted ?? stack).toFixed(2)}</span></>
            )}
          </p>
        </div>

        {/* Net result */}
        {hasResult && (
          <CurrencyDisplay amount={net} netMode className="text-sm" />
        )}

        {/* Buy/Rebuy button */}
        {isOpen && (
          <button
            onClick={onBuyRebuy}
            className="shrink-0 bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-xs font-semibold
                       active:bg-green-100 transition-colors"
          >
            {buyIn === 0 ? 'Buy-in' : '+ Rebuy'}
          </button>
        )}
      </div>

      {/* Transaction history (expandable) */}
      {transactions.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center gap-1 px-3 pb-2.5 text-xs text-gray-400 active:text-gray-600"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="border-t border-gray-50 px-3 pb-3 pt-2 space-y-1.5">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    tx.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {tx.type === 'buy' ? 'Buy-in' : 'Rebuy'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 flex-1">
                    ${parseFloat(tx.amount).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(tx.created_at), 'h:mm a')}
                  </span>
                  {isOpen && (
                    <button
                      onClick={() => onDeleteTx(tx.id)}
                      className="text-gray-300 active:text-red-500 p-1"
                      aria-label="Delete transaction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* Remove player (only if no transactions and game is open) */}
              {isOpen && transactions.length === 0 && (
                <button
                  onClick={onRemove}
                  className="text-xs text-red-400 active:text-red-600 mt-1"
                >
                  Remove from game
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Remove player with no transactions */}
      {isOpen && transactions.length === 0 && (
        <div className="border-t border-gray-50 px-3 py-2">
          <button onClick={onRemove} className="text-xs text-red-400 active:text-red-600">
            Remove from game
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Live balance indicator inside stacks modal
// ─────────────────────────────────────────────────────────────
function StacksBalanceIndicator({ players, stacks, totalPot }) {
  const entered = players.reduce((s, p) => {
    const v = parseFloat(stacks[p.player_id])
    return s + (isNaN(v) ? 0 : v)
  }, 0)
  const diff = entered - totalPot
  const ok   = Math.abs(diff) < 0.01

  return (
    <div className={`text-xs text-center py-1.5 rounded-lg font-medium ${
      ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
    }`}>
      {ok
        ? `✓ Stacks balance ($${entered.toFixed(2)})`
        : `Stacks: $${entered.toFixed(2)} · Pot: $${totalPot.toFixed(2)} · Δ $${Math.abs(diff).toFixed(2)}`
      }
    </div>
  )
}
