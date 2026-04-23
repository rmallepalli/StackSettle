import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  getGame, addPlayerToGame, removePlayerFromGame,
  addTransaction, deleteTransaction, finalizeGame, deleteGame,
  updatePlayerResult, bulkUpdateStacks, updateGame,
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

  const EMPTY_PLAYER = { name:'',phone:'',email:'',venmo_handle:'',zelle_contact:'',paypal_handle:'',cashapp_tag:'',other_payment:'' }

  // Modal open/close state
  const [txModal,          setTxModal]          = useState(null)    // player object
  const [adjustModal,      setAdjustModal]      = useState(null)    // player object
  const [addPlayerModal,   setAddPlayerModal]   = useState(false)
  const [newPlayerModal,   setNewPlayerModal]   = useState(false)
  const [stacksModal,      setStacksModal]      = useState(false)
  const [editGameModal,    setEditGameModal]     = useState(false)
  const [finalizeConfirm,  setFinalizeConfirm]  = useState(false)
  const [deleteConfirm,    setDeleteConfirm]    = useState(false)

  // Form state
  const [newPlayerForm, setNewPlayerForm] = useState(EMPTY_PLAYER)
  const [txAmount,      setTxAmount]      = useState('')
  const [txType,        setTxType]        = useState('buy')
  const [stacks,        setStacks]        = useState({})
  const [adjustAmount,  setAdjustAmount]  = useState('')
  const [editGameForm,  setEditGameForm]  = useState({})

  // Loading flags
  const [txSaving,      setTxSaving]      = useState(false)
  const [stacksSaving,  setStacksSaving]  = useState(false)
  const [adjustSaving,  setAdjustSaving]  = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ─────────────────────────────────────────────
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

  // Sorted results for the Results section
  const sortedResults = [...game.players]
    .filter((p) => p.net_result != null)
    .sort((a, b) => parseFloat(b.net_result) - parseFloat(a.net_result))

  // ── Add existing player ──────────────────────
  const handleAddExistingPlayer = async (player) => {
    try {
      await addPlayerToGame(game.id, { player_id: player.id })
      toast.success(`${player.name} added`)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    }
  }

  // ── Add new player on-the-fly ────────────────
  const handleAddNewPlayer = async () => {
    if (!newPlayerForm.name.trim()) return toast.error('Name is required')
    setActionLoading(true)
    try {
      await addPlayerToGame(game.id, newPlayerForm)
      toast.success(`${newPlayerForm.name} added`)
      setNewPlayerModal(false)
      setNewPlayerForm(EMPTY_PLAYER)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Remove player ────────────────────────────
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

  // ── Buy / Rebuy ──────────────────────────────
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

  // ── Ending stacks ────────────────────────────
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
      .filter((_, i) => stacks[game.players[i].player_id] !== '')

    if (!payload.length) return toast.error('Enter at least one stack')

    const stackTotal = payload.reduce((s, p) => s + p.ending_stack, 0)
    const diff = Math.abs(stackTotal - totalPot)
    if (diff > 0.01) {
      toast.error(`Stacks $${stackTotal.toFixed(2)} ≠ Pot $${totalPot.toFixed(2)} (Δ $${diff.toFixed(2)})`)
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

  // ── Adjust amount (post-finalization) ────────
  const openAdjustModal = (player) => {
    const current = player.adjusted_amount ?? player.ending_stack ?? ''
    setAdjustAmount(current !== '' ? String(current) : '')
    setAdjustModal(player)
  }

  const handleSaveAdjust = async () => {
    const amt = adjustAmount === '' ? null : parseFloat(adjustAmount)
    if (amt !== null && (isNaN(amt) || amt < 0)) return toast.error('Enter a valid amount')
    setAdjustSaving(true)
    try {
      await updatePlayerResult(game.id, adjustModal.player_id, {
        adjusted_amount: amt,
        ending_stack: adjustModal.ending_stack,
      })
      toast.success('Amount adjusted')
      setAdjustModal(null)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to adjust amount')
    } finally {
      setAdjustSaving(false)
    }
  }

  // ── Edit game details ────────────────────────
  const openEditGame = () => {
    setEditGameForm({
      host_name: game.host_name,
      game_date: game.game_date?.split('T')[0] ?? '',
      notes: game.notes ?? '',
    })
    setEditGameModal(true)
  }

  const handleSaveGame = async () => {
    if (!editGameForm.host_name?.trim()) return toast.error('Host name is required')
    setActionLoading(true)
    try {
      await updateGame(game.id, editGameForm)
      toast.success('Game updated')
      setEditGameModal(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot edit a finalized game')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Finalize ─────────────────────────────────
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

  // ── Delete ───────────────────────────────────
  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await deleteGame(game.id)
      toast.success('Game deleted')
      navigate('/games')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot delete this game')
      setDeleteConfirm(false)
      setActionLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      {/* ── Header ──────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/games')} className="text-slate-500 p-1 -ml-1 active:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-100 truncate">{game.host_name}'s Game</h1>
          <p className="text-xs text-slate-500">{dateStr}</p>
        </div>
        <StatusBadge status={game.status} />
        {isOpen && (
          <button onClick={openEditGame} className="text-slate-500 active:text-slate-200 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* ── Pot card ───────────────────────────── */}
        <div className="card bg-green-600 text-white py-5 text-center">
          <p className="text-green-200 text-xs font-medium uppercase tracking-wider">Total Pot</p>
          <p className="text-5xl font-bold mt-1">${totalPot.toFixed(2)}</p>
          <p className="text-green-200 text-xs mt-1">
            {game.players.length} player{game.players.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Results summary (finalized / settled) ─ */}
        {isLocked && sortedResults.length > 0 && (
          <ResultsSummary players={sortedResults} onAdjust={isFinalized ? openAdjustModal : null} />
        )}

        {/* ── Players / transactions (open game) ──── */}
        {(isOpen || isLocked) && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-slate-100 text-sm">
                {isOpen ? 'Players' : 'Transactions'}
              </h2>
              {isOpen && (
                <div className="flex gap-3">
                  <button className="text-xs text-emerald-400 font-medium active:text-emerald-300"
                    onClick={() => setAddPlayerModal(true)}>
                    + Existing
                  </button>
                  <button className="text-xs text-emerald-400 font-medium active:text-emerald-300"
                    onClick={() => { setNewPlayerForm(EMPTY_PLAYER); setNewPlayerModal(true) }}>
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
                <p className="text-sm text-slate-500 text-center py-6">
                  No players yet.{isOpen && ' Use "+ Existing" or "+ New" above.'}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Open game actions ──────────────────── */}
        {isOpen && game.players.length > 0 && (
          <section className="space-y-2 pt-1">
            <button className="btn-primary w-full py-3" onClick={openStacksModal}>
              Enter Ending Stacks
            </button>
            <button
              className="w-full py-3 rounded-xl border border-emerald-700/60 text-emerald-400 font-semibold text-sm active:bg-emerald-900/20 transition-colors"
              onClick={() => setFinalizeConfirm(true)}
            >
              Finalize Game
            </button>
            <button
              className="text-red-400 text-sm w-full py-2 active:text-red-600"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete Game
            </button>
          </section>
        )}

        {/* ── Finalized banner ───────────────────── */}
        {isFinalized && (
          <div className="card bg-amber-900/20 border-amber-700/50 py-4 space-y-1">
            <p className="text-sm font-semibold text-amber-300 text-center">Game Finalized</p>
            <p className="text-xs text-amber-500 text-center">
              Results locked. Tap any player's amount to adjust, or head to Settlements.
            </p>
            <div className="pt-2 text-center">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="text-xs text-red-400 active:text-red-600 font-medium"
              >
                Delete this game
              </button>
            </div>
          </div>
        )}

        {/* ── Settled banner ─────────────────────── */}
        {isSettled && (
          <div className="card bg-slate-700/40 border-slate-600 text-center py-4">
            <p className="text-sm font-semibold text-slate-300">Game Settled</p>
            {game.settled_date && (
              <p className="text-xs text-slate-500 mt-0.5">
                Settled on {format(new Date(game.settled_date), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        )}

        {/* ── Notes ─────────────────────────────── */}
        {game.notes && (
          <div className="card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-slate-300">{game.notes}</p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          MODALS
          ════════════════════════════════════════ */}

      {/* Buy / Rebuy */}
      <Modal
        open={!!txModal}
        onClose={() => setTxModal(null)}
        title={txModal?.name ?? ''}
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setTxModal(null)} disabled={txSaving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleAddTx} disabled={txSaving}>
              {txSaving ? 'Saving…' : `Record ${txType === 'buy' ? 'Buy-in' : 'Rebuy'}`}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-600">
            {['buy','rebuy'].map((t) => (
              <button key={t} onClick={() => setTxType(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${txType===t ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {t === 'buy' ? 'Buy-in' : 'Rebuy'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
              <input type="number" inputMode="decimal" min="1" step="5" className="input pl-7 text-lg font-semibold"
                placeholder="0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} autoFocus />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {[20, 40, 50, 60, 100, 200].map((amt) => (
                <button key={amt} onClick={() => setTxAmount(String(amt))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${txAmount===String(amt) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                  ${amt}
                </button>
              ))}
            </div>
          </div>
          {txModal && (
            <p className="text-xs text-slate-500 text-center">
              Current total: <span className="font-semibold text-slate-300">${parseFloat(txModal.buy_in_total||0).toFixed(2)}</span>
            </p>
          )}
        </div>
      </Modal>

      {/* Enter ending stacks */}
      <Modal open={stacksModal} onClose={() => setStacksModal(false)} title="Enter Ending Stacks"
        footer={
          <div className="space-y-2">
            <StacksBalanceIndicator players={game.players} stacks={stacks} totalPot={totalPot} />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStacksModal(false)} disabled={stacksSaving}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleSaveStacks} disabled={stacksSaving}>
                {stacksSaving ? 'Saving…' : 'Save Stacks'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Enter each player's chip count. Total must equal ${totalPot.toFixed(2)}.</p>
          {game.players.map((p) => (
            <div key={p.player_id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-900/40 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                {p.name.charAt(0)}
              </div>
              <span className="flex-1 text-sm font-medium text-slate-100 truncate">{p.name}</span>
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input type="number" inputMode="decimal" min="0" step="5" className="input pl-6 pr-2 py-2 text-right"
                  placeholder="0" value={stacks[p.player_id]??''}
                  onChange={(e) => setStacks((prev) => ({...prev,[p.player_id]:e.target.value}))} />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Adjust amount (post-finalization) */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)}
        title={`Adjust: ${adjustModal?.name ?? ''}`}
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setAdjustModal(null)} disabled={adjustSaving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSaveAdjust} disabled={adjustSaving}>
              {adjustSaving ? 'Saving…' : 'Save Adjustment'}
            </button>
          </div>
        }
      >
        {adjustModal && (
          <div className="space-y-4">
            <div className="card bg-slate-700/50 space-y-1 py-3">
              <Row label="Bought in" value={`$${parseFloat(adjustModal.buy_in_total||0).toFixed(2)}`} />
              <Row label="Ending stack" value={adjustModal.ending_stack != null ? `$${parseFloat(adjustModal.ending_stack).toFixed(2)}` : '—'} />
              <Row label="Net result" value={<CurrencyDisplay amount={adjustModal.net_result} netMode />} />
            </div>
            <div>
              <label className="label">Adjusted cash-out amount</label>
              <p className="text-xs text-slate-500 mb-2">
                Override the ending stack for settlement purposes (e.g. chip rounding, side bets).
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input type="number" inputMode="decimal" min="0" step="1" className="input pl-7 text-lg font-semibold"
                  placeholder={adjustModal.ending_stack ?? '0'}
                  value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} autoFocus />
              </div>
              {adjustAmount !== '' && adjustModal && (
                <p className="text-xs text-slate-500 mt-2">
                  New net: <CurrencyDisplay amount={parseFloat(adjustAmount) - parseFloat(adjustModal.buy_in_total||0)} netMode />
                </p>
              )}
            </div>
            {adjustModal.adjusted_amount != null && (
              <button className="text-xs text-red-400 active:text-red-600"
                onClick={() => setAdjustAmount('')}>
                Clear adjustment (revert to stack)
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Edit game details */}
      <Modal open={editGameModal} onClose={() => setEditGameModal(false)} title="Edit Game"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setEditGameModal(false)} disabled={actionLoading}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSaveGame} disabled={actionLoading}>
              {actionLoading ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Host Name</label>
            <input className="input" value={editGameForm.host_name||''}
              onChange={(e) => setEditGameForm((f) => ({...f, host_name: e.target.value}))} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={editGameForm.game_date||''}
              onChange={(e) => setEditGameForm((f) => ({...f, game_date: e.target.value}))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} value={editGameForm.notes||''}
              onChange={(e) => setEditGameForm((f) => ({...f, notes: e.target.value}))} />
          </div>
        </div>
      </Modal>

      {/* Add existing player */}
      <PlayerSelectModal
        open={addPlayerModal}
        onClose={() => setAddPlayerModal(false)}
        players={allPlayers}
        loading={playersLoading}
        excludeIds={existingIds}
        onSelect={handleAddExistingPlayer}
      />

      {/* Add new player on-the-fly */}
      <Modal open={newPlayerModal} onClose={() => setNewPlayerModal(false)} title="New Player"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setNewPlayerModal(false)} disabled={actionLoading}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleAddNewPlayer} disabled={actionLoading}>
              {actionLoading ? 'Adding…' : 'Add to Game'}
            </button>
          </div>
        }
      >
        <PlayerForm data={newPlayerForm} onChange={setNewPlayerForm} />
      </Modal>

      {/* Finalize confirm */}
      <ConfirmDialog
        open={finalizeConfirm}
        title="Finalize game?"
        message="Locks results. You can still adjust individual amounts after finalizing, but no new buy-ins can be added."
        confirmLabel="Finalize"
        loading={actionLoading}
        onConfirm={handleFinalize}
        onCancel={() => setFinalizeConfirm(false)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete game?"
        message={`This permanently deletes the ${isFinalized ? 'finalized' : ''} game and all its transactions. This can't be undone.`}
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
// Results summary — sorted leaderboard for finalized/settled
// ─────────────────────────────────────────────────────────────
function ResultsSummary({ players, onAdjust }) {
  return (
    <section>
      <h2 className="font-semibold text-slate-100 text-sm mb-2">Results</h2>
      <div className="card py-0 overflow-hidden divide-y divide-slate-700">
        {players.map((p, i) => {
          const net      = parseFloat(p.net_result)
          const adjusted = p.adjusted_amount != null ? parseFloat(p.adjusted_amount) : null
          const stack    = p.ending_stack != null ? parseFloat(p.ending_stack) : null
          const cashOut  = adjusted ?? stack

          return (
            <div key={p.player_id} className="flex items-center gap-3 px-4 py-3">
              {/* Rank */}
              <span className="text-xs font-bold text-slate-600 w-4 text-right">{i + 1}</span>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase
                ${net > 0 ? 'bg-emerald-900/40 text-emerald-400' : net < 0 ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                {p.name.charAt(0)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{p.name}</p>
                <p className="text-xs text-slate-500">
                  In ${parseFloat(p.buy_in_total||0).toFixed(2)}
                  {cashOut != null && ` → Out $${cashOut.toFixed(2)}`}
                  {adjusted != null && <span className="text-orange-400"> (adj)</span>}
                </p>
              </div>

              {/* Net + adjust button */}
              <div className="flex items-center gap-2">
                <CurrencyDisplay amount={net} netMode className="text-base" />
                {onAdjust && (
                  <button onClick={() => onAdjust(p)}
                    className="text-slate-600 active:text-slate-300 p-1" aria-label="Adjust">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// PlayerRow — live game transaction view
// ─────────────────────────────────────────────────────────────
function PlayerRow({ player, transactions, isOpen, onBuyRebuy, onRemove, onDeleteTx }) {
  const [expanded, setExpanded] = useState(false)
  const buyIn = parseFloat(player.buy_in_total || 0)
  const stack = player.ending_stack != null ? parseFloat(player.ending_stack) : null
  const net   = player.net_result != null ? parseFloat(player.net_result) : null

  return (
    <div className="card overflow-hidden py-0">
      <div className="flex items-center gap-3 py-3">
        <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase
          ${net != null ? net > 0 ? 'bg-emerald-900/40 text-emerald-400' : net < 0 ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-400'
            : 'bg-slate-700 text-slate-400'}`}>
          {player.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm truncate">{player.name}</p>
          <p className="text-xs text-slate-500">
            In: <span className="font-medium">${buyIn.toFixed(2)}</span>
            {stack != null && <> · Stack: <span className="font-medium">${stack.toFixed(2)}</span></>}
          </p>
        </div>
        {net != null && <CurrencyDisplay amount={net} netMode className="text-sm shrink-0" />}
        {isOpen && (
          <button onClick={onBuyRebuy}
            className="shrink-0 bg-emerald-900/30 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-semibold active:bg-emerald-900/50">
            {buyIn === 0 ? 'Buy-in' : '+ Rebuy'}
          </button>
        )}
      </div>

      {/* Expand transactions */}
      {transactions.length > 0 && (
        <>
          <button onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center gap-1 px-3 pb-2.5 text-xs text-slate-500 active:text-slate-300">
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="border-t border-slate-700 px-3 pb-3 pt-2 space-y-1.5">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.type==='buy' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
                    {tx.type === 'buy' ? 'Buy-in' : 'Rebuy'}
                  </span>
                  <span className="text-sm font-semibold text-slate-100 flex-1">${parseFloat(tx.amount).toFixed(2)}</span>
                  <span className="text-xs text-slate-500">{format(new Date(tx.created_at), 'h:mm a')}</span>
                  {isOpen && (
                    <button onClick={() => onDeleteTx(tx.id)}
                      className="text-slate-600 active:text-red-400 p-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Remove player (no transactions) */}
      {isOpen && transactions.length === 0 && (
        <div className="border-t border-slate-700 px-3 py-2">
          <button onClick={onRemove} className="text-xs text-red-400 active:text-red-300">
            Remove from game
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Stacks balance indicator
// ─────────────────────────────────────────────────────────────
function StacksBalanceIndicator({ players, stacks, totalPot }) {
  const entered = players.reduce((s, p) => {
    const v = parseFloat(stacks[p.player_id])
    return s + (isNaN(v) ? 0 : v)
  }, 0)
  const diff = entered - totalPot
  const ok   = Math.abs(diff) < 0.01
  return (
    <div className={`text-xs text-center py-1.5 rounded-lg font-medium ${ok ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
      {ok ? `✓ Stacks balance ($${entered.toFixed(2)})` : `Entered $${entered.toFixed(2)} · Pot $${totalPot.toFixed(2)} · Δ $${Math.abs(diff).toFixed(2)}`}
    </div>
  )
}

// Small key/value row helper
function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  )
}
