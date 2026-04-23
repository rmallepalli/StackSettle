import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getGames } from '../services/games.js'
import useFetch from '../hooks/useFetch.js'
import StatusBadge from '../components/StatusBadge.jsx'
import CurrencyDisplay from '../components/CurrencyDisplay.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { ListSkeleton, GameCardSkeleton } from '../components/Skeleton.jsx'

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'open',      label: 'Open' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'settled',   label: 'Settled' },
]

export default function Games() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [hostSearch,  setHostSearch]    = useState('')
  const [dateFrom,    setDateFrom]      = useState('')
  const [dateTo,      setDateTo]        = useState('')

  const activeFilterCount = [hostSearch, dateFrom, dateTo].filter(Boolean).length

  const filters = {
    ...(statusFilter && { status: statusFilter }),
    ...(hostSearch   && { host: hostSearch }),
    ...(dateFrom     && { dateFrom }),
    ...(dateTo       && { dateTo }),
  }

  const { data: games, loading, error, refetch } = useFetch(
    () => getGames(filters),
    [statusFilter, hostSearch, dateFrom, dateTo]
  )

  const clearFilters = () => {
    setHostSearch(''); setDateFrom(''); setDateTo('')
  }

  return (
    <>
      {/* ── Header ───────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100 flex-1">Games</h1>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative p-2 rounded-xl border transition-colors ${
              showFilters || activeFilterCount
                ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-400'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
            aria-label="Filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 text-white text-xs
                               rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            className="btn-primary text-sm py-2 px-4"
            onClick={() => navigate('/games/new')}
          >
            + New
          </button>
        </div>

        {/* Status chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Collapsible advanced filters */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
            <div>
              <label className="label">Host name contains</label>
              <input
                className="input py-2"
                placeholder="e.g. Alice"
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From date</label>
                <input type="date" className="input py-2" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">To date</label>
                <input type="date" className="input py-2" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 active:text-red-700 font-medium">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading && <ListSkeleton Card={GameCardSkeleton} count={4} />}

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {!loading && !error && games?.length === 0 && (
          <EmptyState
            icon="🃏"
            title={activeFilterCount || statusFilter ? 'No matching games' : 'No games yet'}
            description={
              activeFilterCount || statusFilter
                ? 'Try adjusting your filters.'
                : 'Start a new game to begin tracking buy-ins and chip stacks.'
            }
            action={
              !activeFilterCount && !statusFilter && (
                <button className="btn-primary" onClick={() => navigate('/games/new')}>
                  Start first game
                </button>
              )
            }
          />
        )}

        {games?.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => navigate(`/games/${game.id}`)} />
        ))}

        {!loading && games?.length > 0 && (
          <p className="text-center text-xs text-slate-500 pt-1">
            {games.length} game{games.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* FAB — quick new game, visible when scrolled past header button */}
      <button
        onClick={() => navigate('/games/new')}
        className="fixed bottom-24 right-4 sm:right-[calc(50%-theme(maxWidth.lg)/2+1rem)]
                   w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-900/50
                   flex items-center justify-center text-2xl
                   active:bg-green-700 transition-colors z-10"
        aria-label="New game"
      >
        +
      </button>
    </>
  )
}

function GameCard({ game, onClick }) {
  const dateStr = game.game_date
    ? format(new Date(game.game_date), 'EEE, MMM d, yyyy')
    : '—'

  return (
    <button
      onClick={onClick}
      className="card w-full text-left active:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100">{dateStr}</span>
            <StatusBadge status={game.status} />
          </div>
          {/* Host name displayed prominently below the date */}
          <div className="flex items-center gap-1.5 mt-1">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-slate-300">{game.host_name}</span>
            <span className="text-xs text-slate-500">hosting</span>
          </div>
        </div>
        <svg className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
        <Stat label="Host" value={game.host_name} />
        <Stat label="Players" value={game.player_count ?? 0} />
        <Stat label="Total Pot" value={<CurrencyDisplay amount={game.total_pot ?? 0} />} />
        {game.status === 'settled' && game.settled_date && (
          <Stat label="Settled" value={format(new Date(game.settled_date), 'MMM d')} />
        )}
      </div>
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  )
}
