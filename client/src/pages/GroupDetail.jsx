import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getGroup, updateGroup, deleteGroup,
  getGroupMembers, addGroupMember, removeGroupMember,
} from '../services/groups.js'
import { getPlayers } from '../services/players.js'
import { useGroup } from '../contexts/GroupContext.jsx'
import useFetch from '../hooks/useFetch.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PlayerForm from '../components/PlayerForm.jsx'
import PaymentBadges from '../components/PaymentBadges.jsx'
import { PageSpinner } from '../components/Spinner.jsx'

const EMPTY_PLAYER = {
  name: '', phone: '', email: '',
  venmo_handle: '', zelle_contact: '', paypal_handle: '',
  cashapp_tag: '', other_payment: '',
}

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeGroup, selectGroup, clearGroup } = useGroup()

  const { data: group,   loading: gLoading,  refetch: refetchGroup }   = useFetch(() => getGroup(id),         [id])
  const { data: members, loading: mLoading,  refetch: refetchMembers } = useFetch(() => getGroupMembers(id),  [id])
  const { data: allPlayers, loading: pLoading }                         = useFetch(getPlayers)

  const [editForm,       setEditForm]       = useState(null)       // { name, description }
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [addTab,         setAddTab]         = useState('existing') // 'existing' | 'new'
  const [newPlayerForm,  setNewPlayerForm]  = useState(EMPTY_PLAYER)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [removingId,     setRemovingId]     = useState(null)

  if (gLoading) return <PageSpinner />
  if (!group) return null

  // Players not yet in this group (for the "add existing" tab)
  const memberIds = new Set((members || []).map((m) => m.id))
  const availablePlayers = useMemo(() => {
    if (!allPlayers) return []
    const q = searchQuery.trim().toLowerCase()
    return allPlayers
      .filter((p) => !memberIds.has(p.id))
      .filter((p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      )
  }, [allPlayers, memberIds, searchQuery])

  // ── Edit group info ───────────────────────────
  const openEdit = () => setEditForm({ name: group.name, description: group.description || '' })

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return toast.error('Group name is required')
    setSaving(true)
    try {
      const updated = await updateGroup(id, editForm)
      toast.success('Group updated')
      setEditForm(null)
      refetchGroup()
      // Refresh activeGroup context if this is the current group
      if (activeGroup?.id === updated.id) selectGroup(updated)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update group')
    } finally {
      setSaving(false)
    }
  }

  // ── Add member: existing player ───────────────
  const handleAddExisting = async (player) => {
    setSaving(true)
    try {
      await addGroupMember(id, { player_id: player.id })
      toast.success(`${player.name} added to group`)
      setSearchQuery('')
      refetchMembers()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  // ── Add member: new player ────────────────────
  const handleAddNew = async () => {
    if (!newPlayerForm.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      await addGroupMember(id, newPlayerForm)
      toast.success(`${newPlayerForm.name} added`)
      setNewPlayerForm(EMPTY_PLAYER)
      setShowAddModal(false)
      refetchMembers()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add player')
    } finally {
      setSaving(false)
    }
  }

  // ── Remove member ─────────────────────────────
  const handleRemove = async (player) => {
    setRemovingId(player.id)
    try {
      await removeGroupMember(id, player.id)
      toast.success(`${player.name} removed from group`)
      refetchMembers()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  // ── Delete group ──────────────────────────────
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteGroup(id)
      toast.success('Group deleted')
      if (activeGroup?.id === parseInt(id)) clearGroup()
      navigate('/groups')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot delete this group')
      setDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Sub-header */}
      <div className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/groups')} className="text-slate-500 p-1 -ml-1 active:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-100 truncate">{group.name}</h1>
          <p className="text-xs text-slate-500">Group Settings</p>
        </div>
        <button
          onClick={openEdit}
          className="text-slate-500 active:text-slate-200 p-1"
          aria-label="Edit group"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-5">

        {/* Group info card */}
        <div className="card space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/40 text-emerald-400 font-bold text-xl
                            flex items-center justify-center shrink-0 uppercase">
              {group.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-100 text-lg leading-tight">{group.name}</p>
              {group.description
                ? <p className="text-sm text-slate-400 mt-0.5">{group.description}</p>
                : <p className="text-xs text-slate-600 mt-0.5 italic">No description</p>}
            </div>
          </div>
        </div>

        {/* Members section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-100 text-sm">
              Members
              <span className="ml-2 text-slate-500 font-normal">{members?.length ?? 0}</span>
            </h2>
            <button
              className="text-sm text-emerald-400 font-medium active:text-emerald-300"
              onClick={() => { setShowAddModal(true); setAddTab('existing'); setSearchQuery('') }}
            >
              + Add Member
            </button>
          </div>

          {mLoading && <PageSpinner />}

          {!mLoading && members?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No members yet.{' '}
              <button
                className="text-emerald-400 font-medium"
                onClick={() => { setShowAddModal(true); setAddTab('new') }}
              >
                Add the first one.
              </button>
            </p>
          )}

          <div className="space-y-2">
            {members?.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                removing={removingId === member.id}
                onRemove={() => handleRemove(member)}
              />
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <div className="pt-4 border-t border-slate-700">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-sm text-red-400 active:text-red-300 font-medium"
          >
            Delete this group
          </button>
          <p className="text-xs text-slate-600 mt-1">
            Only possible when all games are settled.
          </p>
        </div>
      </div>

      {/* Edit group modal */}
      {editForm && (
        <Modal
          open
          onClose={() => setEditForm(null)}
          title="Edit Group"
          footer={
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setEditForm(null)} disabled={saving}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Group Name <span className="text-red-500">*</span></label>
              <input className="input" value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description <span className="text-slate-500 font-normal">(optional)</span></label>
              <input className="input" value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Add member modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setSearchQuery(''); setNewPlayerForm(EMPTY_PLAYER) }}
        title="Add Member"
        footer={addTab === 'new' ? (
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => { setShowAddModal(false); setNewPlayerForm(EMPTY_PLAYER) }}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {pLoading && <PageSpinner />}
            {!pLoading && availablePlayers.length === 0 && (
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete group?"
        message="This permanently deletes the group and its membership list. Past game records are preserved. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  )
}

function MemberCard({ member, removing, onRemove }) {
  return (
    <div className="card flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-emerald-900/40 text-emerald-400 font-bold text-xs
                      flex items-center justify-center shrink-0 uppercase">
        {member.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-100 text-sm truncate">{member.name}</p>
        {(member.phone || member.email) && (
          <p className="text-xs text-slate-500 truncate">
            {[member.phone, member.email].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mt-1">
          <PaymentBadges player={member} />
        </div>
      </div>
      <button
        onClick={onRemove}
        disabled={removing}
        className="text-slate-600 active:text-red-400 p-2 shrink-0"
        aria-label="Remove member"
      >
        {removing
          ? <span className="text-xs text-slate-500">…</span>
          : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          )}
      </button>
    </div>
  )
}
