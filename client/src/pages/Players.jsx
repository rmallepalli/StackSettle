import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getPlayers, updatePlayer } from '../services/players.js'
import { getGroupMembers, addGroupMember, removeGroupMember } from '../services/groups.js'
import { useGroup } from '../contexts/GroupContext.jsx'
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
  const { activeGroup } = useGroup()
  const groupId = activeGroup?.id

  const { data: members, loading, error, refetch } = useFetch(
    () => getGroupMembers(groupId),
    [groupId]
  )
  const { data: allPlayers } = useFetch(getPlayers)

  const [search,        setSearch]        = useState('')
  const [showAdd,       setShowAdd]       = useState(false)
  const [addTab,        setAddTab]        = useState('existing')
  const [addSearch,     setAddSearch]     = useState('')
  const [newPlayerForm, setNewPlayerForm] = useState(EMPTY_FORM)
  const [editTarget,    setEditTarget]    = useState(null)
  const [removeTarget,  setRemoveTarget]  = useState(null)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [saving,        setSaving]        = useState(false)
  const [removing,      setRemoving]      = useState(false)

  const memberIds = useMemo(() => new Set((members || []).map((m) => m.id)), [members])

  const filtered = useMemo(() => {
    if (!members) return []
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    )
  }, [members, search])

  const availablePlayers = useMemo(() => {
    if (!allPlayers) return []
    const q = addSearch.trim().toLowerCase()
    return allPlayers
      .filter((p) => !memberIds.has(p.id))
      .filter((p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      )
  }, [allPlayers, memberIds, addSearch])

  // --- Add Existing ---
  const handleAddExisting = async (player) => {
    setSaving(true)
    try {
      await addGroupMember(groupId, { player_id: player.id })
      toast.success(`${player.name} added to group`)
      setAddSearch('')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  // --- Add New ---
  const handleAddNew = async () => {
    if (!newPlayerForm.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      await addGroupMember(groupId, newPlayerForm)
      toast.success(`${newPlayerForm.name} added`)
      setNewPlayerForm(EMPTY_FORM)
      setShowAdd(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    } finally {
      setSaving(false)
    }
  }

  // --- Edit (global player record) ---
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

  // --- Remove from group ---
  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeGroupMember(groupId, removeTarget.id)
      toast.success(`${removeTarget.name} removed from group`)
      refetch()
      setRemoveTarget(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  const openAddModal = (tab = 'existing') => {
    setAddTab(tab)
    setAddSearch('')
    setNewPlayerForm(EMPTY_FORM)
    setShowAdd(true)
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100 flex-1">Players</h1>
          <button className="btn-primary text-sm py-2 px-4" onClick={() => openAddModal('existing')}>
            + Add
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              className="input pl-9 py-2"
              placeholder="Search members…"
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
            ? <EmptyState icon="🔍" title="No members match" description={`No results for "${search}"`} />
            : <EmptyState
                icon="👤"
                title="No members yet"
                description="Add players to this group to get started."
                action={
                  <button className="btn-primary" onClick={() => openAddModal('new')}>
                    Add first player
                  </button>
                }
              />
        )}

        {filtered.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onEdit={() => openEdit(player)}
            onRemove={() => setRemoveTarget(player)}
          />
        ))}

        {!loading && members?.length > 0 && (
          <p className="text-center text-xs text-slate-500 pt-2">
            {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Add modal ──────────────────────────────── */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddSearch(''); setNewPlayerForm(EMPTY_FORM) }}
        title="Add Member"
        footer={addTab === 'new' ? (
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => { setShowAdd(false); setNewPlayerForm(EMPTY_FORM) }}
              disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleAddNew} disabled={saving}>
              {saving ? 'Adding…' : 'Create & Add'}
            </button>
          </div>
        ) : null}
      >
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-600 mb-4">
          {[['existing', 'Add Existing'], ['new', 'Create New']].map(([tab, label]) => (
            <button key={tab} onClick={() => setAddTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                addTab === tab ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {addTab === 'existing' && (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Search players…"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              autoFocus
            />
            {availablePlayers.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                {allPlayers?.length ? 'All players are already members.' : 'No players in the system yet.'}
              </p>
            )}
            <div className="space-y-1 max-h-64 overflow-y-auto -mx-4 px-4">
              {availablePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddExisting(p)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-slate-700 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-900/40 text-emerald-400 font-bold text-xs
                                  flex items-center justify-center shrink-0 uppercase">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{p.name}</p>
                    {(p.phone || p.email) && (
                      <p className="text-xs text-slate-500 truncate">
                        {[p.phone, p.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {addTab === 'new' && (
          <PlayerForm data={newPlayerForm} onChange={setNewPlayerForm} />
        )}
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

      {/* ── Remove confirm ─────────────────────────── */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove from group?"
        message={`Remove ${removeTarget?.name} from this group? Their profile and game history are preserved.`}
        confirmLabel="Remove"
        danger
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  )
}

function PlayerCard({ player, onEdit, onRemove }) {
  return (
    <div className="card flex items-start gap-3 py-3">
      <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-400 font-bold text-sm
                      flex items-center justify-center shrink-0 uppercase">
        {player.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-100 truncate">{player.name}</p>
        {(player.phone || player.email) && (
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {[player.phone, player.email].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mt-1.5">
          <PaymentBadges player={player} />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-slate-500 active:text-slate-200 rounded-lg active:bg-slate-700"
          aria-label="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-slate-500 active:text-red-400 rounded-lg active:bg-red-900/20"
          aria-label="Remove from group"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
