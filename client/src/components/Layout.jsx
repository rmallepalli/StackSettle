import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const NAV = [
  {
    to: '/games',
    label: 'Games',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    to: '/players',
    label: 'Players',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/settlements',
    label: 'Settle',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    /* Full viewport, centered column — max-w-lg constrains on desktop */
    <div className="min-h-screen flex flex-col bg-gray-100 sm:bg-gray-200">
      <div className="flex-1 flex flex-col w-full max-w-lg mx-auto bg-gray-50 shadow-sm sm:shadow-xl relative">

        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 active:opacity-70 select-none"
          >
            <span className="text-2xl leading-none">♠</span>
            <span className="font-bold text-gray-900 text-lg tracking-tight">StackSettle</span>
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-gray-400 active:text-gray-600 px-2 py-1"
          >
            Logout
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 min-h-0 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20 safe-area-bottom sm:sticky sm:bottom-auto sm:top-auto">
          {/* On desktop the nav is still at bottom of the fixed column */}
          <div className="w-full max-w-lg mx-auto flex">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors select-none ${
                    isActive ? 'text-green-600' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {icon(isActive)}
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
