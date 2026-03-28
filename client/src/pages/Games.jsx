import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getGames } from '../services/games.js'
import useFetch from '../hooks/useFetch.js'
import StatusBadge from '../components/StatusBadge.jsx'
import CurrencyDisplay from '../components/CurrencyDisplay.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { PageSpinner } from '../components/Spinner.jsx'

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'open',      label: 'Open' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'settled',   label: 'Settled' },
]

export default function Games() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: games, loading, error, refetch } = useFetch(
    () => getGames(statusFilter ? { status: statusFilter } : {}),
    [statusFilter]
  )

  return (
    <>
      {/* ── Header ─────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 flex-1">Games</h1>
          <button
            className="btn-primary text-sm py-2 px-4"
            onClick={() => navigate('/games/new')}
          >
            + New Game
          </button>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading && <PageSpinner />}

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {!loading && !error && games?.length === 0 && (
          <EmptyState
            icon="🃏"
            title={statusFilter ? `No ${statusFilter} games` : 'No games yet'}
            description="Start a new game to begin tracking buy-ins and chip stacks."
            action={
              <button className="btn-primary" onClick={() => navigate('/games/new')}>
                Start first game
              </button>
            }
          />
        )}

        {games?.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => navigate(`/games/${game.id}`)} />
        ))}
      </div>
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
      className="card w-full text-left active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{game.host_name}'s Game</span>
            <StatusBadge status={game.status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <svg className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
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
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
