import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getPlayers, createPlayer, updatePlayer, deletePlayer } from '../services/players.js'
import useFetch from '../hooks/useFetch.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PlayerForm from '../components/PlayerForm.jsx'
import PaymentBadges from '../components/PaymentBadges.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { ListSkeleton, PlayerCardSkeleton } from '../components/Skeleton.jsx'

const EMPTY_FORM = {
  name: '', phone: '', email: '',
  venmo_handle: '', zelle_contact: '', paypal_handle: '',
  cashapp_tag: '', other_payment: '',
}

export default function Players() {
  const { data: players, loading, error, refetch } = useFetch(getPlayers)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // player object
  const [deleteTarget, setDeleteTarget] = useState(null) // player object
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Client-side filter (fast, no extra API call)
  const filtered = useMemo(() => {
    if (!players) return []
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    )
  }, [players, search])

  // --- Add ---
  const openAdd = () => { setForm(EMPTY_FORM); setShowAdd(true) }
  const closeAdd = () => setShowAdd(false)

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      await createPlayer(form)
      toast.success(`${form.name} added`)
      refetch()
      closeAdd()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    } finally {
      setSaving(false)
    }
  }

  // --- Edit ---
  const openEdit = (player) => { setForm({ ...player }); setEditTarget(player) }
  const closeEdit = () => setEditTarget(null)

  const handleEdit = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      await updatePlayer(editTarget.id, form)
      toast.success('Player updated')
      refetch()
      closeEdit()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update player')
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ---
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePlayer(deleteTarget.id)
      toast.success(`${deleteTarget.name} removed`)
      refetch()
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete player')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 flex-1">Players</h1>
          <button className="btn-primary text-sm py-2 px-4" onClick={openAdd}>
            + Add
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              className="input pl-9 py-2"
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading && <ListSkeleton Card={PlayerCardSkeleton} count={5} />}

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {!loading && !error && filtered.length === 0 && (
          search
            ? <EmptyState icon="🔍" title="No players match" description={`No results for "${search}"`} />
            : <EmptyState
                icon="👤"
                title="No players yet"
                description="Add your regular crew to get started."
                action={<button className="btn-primary" onClick={openAdd}>Add first player</button>}
              />
        )}

        {filtered.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onEdit={() => openEdit(player)}
            onDelete={() => setDeleteTarget(player)}
          />
        ))}

        {!loading && players?.length > 0 && (
          <p className="text-center text-xs text-gray-400 pt-2">
            {filtered.length} of {players.length} player{players.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Add modal ──────────────────────────────── */}
      <Modal
        open={showAdd}
        onClose={closeAdd}
        title="New Player"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={closeAdd} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Add Player'}
            </button>
          </div>
        }
      >
        <PlayerForm data={form} onChange={setForm} />
      </Modal>

      {/* ── Edit modal ─────────────────────────────── */}
      <Modal
        open={!!editTarget}
        onClose={closeEdit}
        title="Edit Player"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={closeEdit} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <PlayerForm data={form} onChange={setForm} />
      </Modal>

      {/* ── Delete confirm ─────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove player?"
        message={`Remove ${deleteTarget?.name} from the player list? This won't affect past game records.`}
        confirmLabel="Remove"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

function PlayerCard({ player, onEdit, onDelete }) {
  return (
    <div className="card flex items-start gap-3 py-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm
                      flex items-center justify-center shrink-0 uppercase">
        {player.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{player.name}</p>
        {(player.phone || player.email) && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {[player.phone, player.email].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mt-1.5">
          <PaymentBadges player={player} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 active:text-gray-700 rounded-lg active:bg-gray-100"
          aria-label="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 active:text-red-600 rounded-lg active:bg-red-50"
          aria-label="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
