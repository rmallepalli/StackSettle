import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { getGroupMembers } from '../services/groups.js'
import { createGame, addPlayerToGame, addTransaction } from '../services/games.js'
import { useGroup } from '../contexts/GroupContext.jsx'
import useFetch from '../hooks/useFetch.js'
import Modal from '../components/Modal.jsx'
import PlayerForm from '../components/PlayerForm.jsx'
import { PageSpinner } from '../components/Spinner.jsx'

const EMPTY_NEW_PLAYER = {
  name: '', phone: '', email: '',
  venmo_handle: '', zelle_contact: '', paypal_handle: '',
  cashapp_tag: '', other_payment: '',
}

const DRAFT_KEY = 'ss_new_game_draft'

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return {
      ...d,
      selectedIds: new Set(d.selectedIds || []),
    }
  } catch { return null }
}

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      selectedIds: [...data.selectedIds],
    }))
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

export default function NewGame() {
  const navigate = useNavigate()
  const { activeGroup } = useGroup()
  const groupId = activeGroup?.id
  const { data: allPlayers, loading: playersLoading } = useFetch(
    () => getGroupMembers(groupId),
    [groupId]
  )

  // Restore from draft on mount
  const draft = loadDraft()

  // Game fields
  const [hostName, setHostName]   = useState(draft?.hostName || '')
  const [gameDate, setGameDate]   = useState(draft?.gameDate || format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes]         = useState(draft?.notes || '')

  // Player selection
  const [search, setSearch]             = useState('')
  const [selectedIds, setSelectedIds]   = useState(draft?.selectedIds || new Set())
  const [buyIns, setBuyIns]             = useState(draft?.buyIns || {})

  // New-player-on-the-fly modal
  const [showNewPlayer, setShowNewPlayer] = useState(false)
  const [newPlayerForm, setNewPlayerForm] = useState(EMPTY_NEW_PLAYER)

  // Transient new players (not yet in DB; added via the modal)
  const [pendingPlayers, setPendingPlayers] = useState(draft?.pendingPlayers || [])

  const [saving, setSaving]     = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // ── Auto-save draft whenever form state changes ────────
  const persistDraft = useCallback(() => {
    saveDraft({ hostName, gameDate, notes, selectedIds, buyIns, pendingPlayers })
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 1500)
  }, [hostName, gameDate, notes, selectedIds, buyIns, pendingPlayers])

  useEffect(() => {
    // Debounce: save 800ms after last change
    const t = setTimeout(persistDraft, 800)
    return () => clearTimeout(t)
  }, [persistDraft])

  // ── Derived ────────────────────────────────────────────
  const filteredExisting = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || !allPlayers) return allPlayers || []
    return allPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    )
  }, [allPlayers, search])

  const selectedCount = selectedIds.size

  // ── Helpers ────────────────────────────────────────────
  const togglePlayer = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const setBuyIn = (id, val) => {
    setBuyIns((prev) => ({ ...prev, [id]: val }))
  }

  // ── Add pending player ─────────────────────────────────
  const handleAddNewPlayer = () => {
    if (!newPlayerForm.name.trim()) return toast.error('Name is required')
    const tempId = `temp-${Date.now()}`
    const entry = { ...newPlayerForm, tempId }
    setPendingPlayers((prev) => [...prev, entry])
    setSelectedIds((prev) => new Set([...prev, tempId]))
    setNewPlayerForm(EMPTY_NEW_PLAYER)
    setShowNewPlayer(false)
    toast.success(`${newPlayerForm.name} added`)
  }

  const removePending = (tempId) => {
    setPendingPlayers((prev) => prev.filter((p) => p.tempId !== tempId))
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(tempId); return n })
    setBuyIns((prev) => { const n = { ...prev }; delete n[tempId]; return n })
  }

  // ── Create game ────────────────────────────────────────
  const handleCreate = async () => {
    if (!hostName.trim()) return toast.error('Host name is required')
    if (selectedCount === 0) return toast.error('Add at least one player')

    setSaving(true)
    try {
      // 1. Create the game
      const game = await createGame({ host_name: hostName, game_date: gameDate, notes, group_id: groupId })

      // 2. Add pending players (create in DB), then all players to game
      const resolvedIds = []

      for (const p of pendingPlayers) {
        if (selectedIds.has(p.tempId)) {
          // Create player + add to game in one call (server handles this)
          const result = await addPlayerToGame(game.id, {
            name: p.name, phone: p.phone, email: p.email,
            venmo_handle: p.venmo_handle, zelle_contact: p.zelle_contact,
            paypal_handle: p.paypal_handle, cashapp_tag: p.cashapp_tag,
            other_payment: p.other_payment,
          })
          // The updated game object has all players; find the new one by name
          const added = result.players.find((pl) => pl.name === p.name)
          if (added) resolvedIds.push({ id: added.player_id, tempId: p.tempId })
        }
      }

      // 3. Add existing (DB) players
      const existingSelected = [...selectedIds].filter((id) => typeof id === 'number')
      await Promise.all(existingSelected.map((pid) => addPlayerToGame(game.id, { player_id: pid })))

      // 4. Record buy-ins where an amount was entered
      //    resolvedIds: { id (DB), tempId } for newly-created players
      //    existingSelected: numeric DB ids
      const allResolved = [
        ...existingSelected.map((id) => ({ id, key: id })),
        ...resolvedIds.map((r) => ({ id: r.id, key: r.tempId })),
      ]

      const txPromises = []
      for (const { id, key } of allResolved) {
        const amt = parseFloat(buyIns[key])
        if (amt > 0) {
          txPromises.push(addTransaction(game.id, { player_id: id, amount: amt, type: 'buy' }))
        }
      }
      await Promise.all(txPromises)

      clearDraft()
      toast.success('Game created!')
      navigate(`/games/${game.id}`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create game')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    clearDraft()
    navigate('/games')
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      <div className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button onClick={handleDiscard} className="text-slate-500 active:text-slate-300 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-100">New Game</h1>
          {draft && !draftSaved && (
            <p className="text-xs text-slate-500">Draft restored</p>
          )}
          {draftSaved && (
            <p className="text-xs text-emerald-400">Draft saved</p>
          )}
        </div>
        <button
          className="btn-primary text-sm py-2 px-4"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ── Game details ─────────────────────── */}
        <section className="card space-y-3">
          <h2 className="font-semibold text-slate-100 text-sm">Game Details</h2>
          <div>
            <label className="label">Host Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="Who's hosting tonight?"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notes <span className="text-slate-500 font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any notes about tonight…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        {/* ── Player selection ─────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-100 text-sm">
              Players
              {selectedCount > 0 && (
                <span className="ml-2 text-emerald-400">{selectedCount} selected</span>
              )}
            </h2>
            <button
              className="text-sm text-emerald-400 font-medium active:text-emerald-300"
              onClick={() => { setNewPlayerForm(EMPTY_NEW_PLAYER); setShowNewPlayer(true) }}
            >
              + New Player
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              className="input pl-9 py-2"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {playersLoading && <PageSpinner />}

          {/* Pending (new) players always shown first */}
          {pendingPlayers.length > 0 && (
            <div className="space-y-1 mb-1">
              {pendingPlayers.map((p) => (
                <PlayerRow
                  key={p.tempId}
                  id={p.tempId}
                  name={p.name}
                  sub="New player"
                  checked={selectedIds.has(p.tempId)}
                  onToggle={() => togglePlayer(p.tempId)}
                  buyIn={buyIns[p.tempId] || ''}
                  onBuyIn={(v) => setBuyIn(p.tempId, v)}
                  isNew
                  onRemove={() => removePending(p.tempId)}
                />
              ))}
            </div>
          )}

          {/* Existing players */}
          {filteredExisting.length === 0 && !playersLoading && !pendingPlayers.length && (
            <p className="text-sm text-slate-500 text-center py-6">
              No players found.{' '}
              <button
                className="text-emerald-400 font-medium"
                onClick={() => setShowNewPlayer(true)}
              >
                Add one?
              </button>
            </p>
          )}

          <div className="space-y-1">
            {filteredExisting.map((p) => (
              <PlayerRow
                key={p.id}
                id={p.id}
                name={p.name}
                sub={[p.phone, p.email].filter(Boolean).join(' · ')}
                checked={selectedIds.has(p.id)}
                onToggle={() => togglePlayer(p.id)}
                buyIn={buyIns[p.id] || ''}
                onBuyIn={(v) => setBuyIn(p.id, v)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ── New player modal ───────────────────── */}
      <Modal
        open={showNewPlayer}
        onClose={() => setShowNewPlayer(false)}
        title="New Player"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setShowNewPlayer(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddNewPlayer}>
              Add to Game
            </button>
          </div>
        }
      >
        <PlayerForm data={newPlayerForm} onChange={setNewPlayerForm} />
      </Modal>
    </>
  )
}

function PlayerRow({ id, name, sub, checked, onToggle, buyIn, onBuyIn, isNew, onRemove }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        checked
          ? 'bg-emerald-900/20 border-emerald-700/50'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0" onClick={onToggle}>
        <p className="text-sm font-medium text-slate-100 truncate">
          {name}
          {isNew && <span className="ml-1.5 text-xs text-emerald-400 font-normal">new</span>}
        </p>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>

      {/* Buy-in input (only when selected) */}
      {checked && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm text-slate-500">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="5"
            className="w-20 border border-slate-600 rounded-lg px-2 py-1 text-right bg-slate-700 text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buy-in"
            value={buyIn}
            onChange={(e) => onBuyIn(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Remove pending player */}
      {isNew && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-slate-600 active:text-red-400 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
