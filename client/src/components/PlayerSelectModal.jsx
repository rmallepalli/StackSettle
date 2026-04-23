/**
 * Reusable modal for searching and picking a player from the saved list.
 * Used in GameDetail to add a player mid-game.
 */
import { useState, useMemo } from 'react'
import Modal from './Modal.jsx'
import { PageSpinner } from './Spinner.jsx'

export default function PlayerSelectModal({ open, onClose, players, loading, onSelect, excludeIds = [] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!players) return []
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => !excludeIds.includes(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      )
  }, [players, search, excludeIds])

  const handleClose = () => { setSearch(''); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Add Player to Game">
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {loading && <PageSpinner />}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            {excludeIds.length && !search ? 'All players are already in this game.' : 'No players found.'}
          </p>
        )}

        <div className="space-y-1 max-h-72 overflow-y-auto -mx-4 px-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); handleClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         active:bg-slate-700 text-left transition-colors"
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
    </Modal>
  )
}
