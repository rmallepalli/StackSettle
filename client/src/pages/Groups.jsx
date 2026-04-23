import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getGroups, createGroup } from '../services/groups.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../contexts/GroupContext.jsx'
import useFetch from '../hooks/useFetch.js'
import Modal from '../components/Modal.jsx'

export default function Groups() {
  const { logout } = useAuth()
  const { activeGroup, selectGroup } = useGroup()
  const navigate = useNavigate()

  const { data: groups, loading, refetch } = useFetch(getGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving]         = useState(false)

  const handleSelect = (group) => {
    selectGroup(group)
    navigate('/games')
  }

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Group name is required')
    setSaving(true)
    try {
      const group = await createGroup({ name: name.trim(), description: description.trim() || undefined })
      toast.success(`"${group.name}" created`)
      setShowCreate(false)
      setName('')
      setDescription('')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700/80 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none text-emerald-400">♠</span>
          <span className="font-bold text-slate-100 text-lg tracking-tight">StackSettle</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 active:text-slate-300 px-2 py-1"
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 pt-6 pb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100">Your Groups</h2>
          <p className="text-sm text-slate-500 mt-1">Select a group to start playing</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="h-5 bg-slate-700 rounded w-36" />
                <div className="h-3 bg-slate-700 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {!loading && groups?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🃏</div>
            <h3 className="text-lg font-semibold text-slate-100 mb-1">No groups yet</h3>
            <p className="text-sm text-slate-400 mb-6">Create your first group to start tracking games.</p>
            <button className="btn-primary px-6 py-3" onClick={() => setShowCreate(true)}>
              Create Group
            </button>
          </div>
        )}

        <div className="space-y-3">
          {groups?.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isActive={activeGroup?.id === group.id}
              onSelect={() => handleSelect(group)}
              onSettings={() => navigate(`/groups/${group.id}`)}
            />
          ))}
        </div>

        {groups?.length > 0 && (
          <button
            className="mt-4 w-full py-3 rounded-xl border border-dashed border-slate-600
                       text-slate-400 text-sm font-medium active:bg-slate-800 transition-colors"
            onClick={() => setShowCreate(true)}
          >
            + New Group
          </button>
        )}
      </div>

      {/* Create group modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setName(''); setDescription('') }}
        title="New Group"
        footer={
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => { setShowCreate(false); setName(''); setDescription('') }}
              disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Group Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Friday Night Poker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description <span className="text-slate-500 font-normal">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Office crew, bi-weekly game"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GroupCard({ group, isActive, onSelect, onSettings }) {
  return (
    <div className={`card flex items-center gap-3 py-3 transition-colors ${
      isActive ? 'border-emerald-600/60 bg-emerald-900/10' : ''
    }`}>
      {/* Avatar */}
      <div className="w-11 h-11 rounded-2xl bg-emerald-900/40 text-emerald-400 font-bold text-lg
                      flex items-center justify-center shrink-0 uppercase select-none">
        {group.name.charAt(0)}
      </div>

      {/* Info — tap to enter */}
      <button className="flex-1 min-w-0 text-left" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-100 truncate">{group.name}</p>
          {isActive && (
            <span className="text-xs text-emerald-400 font-medium shrink-0">active</span>
          )}
        </div>
        {group.description && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{group.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-slate-500">
            <span className="font-medium text-slate-300">{group.member_count ?? 0}</span> members
          </span>
          <span className="text-xs text-slate-500">
            <span className="font-medium text-slate-300">{group.game_count ?? 0}</span> games
          </span>
        </div>
      </button>

      {/* Settings */}
      <button
        onClick={onSettings}
        className="text-slate-600 active:text-slate-300 p-2 shrink-0"
        aria-label="Group settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}
