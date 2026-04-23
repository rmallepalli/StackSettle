import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { GroupProvider, useGroup } from './contexts/GroupContext.jsx'
import Layout       from './components/Layout.jsx'
import Login        from './pages/Login.jsx'
import Groups       from './pages/Groups.jsx'
import GroupDetail  from './pages/GroupDetail.jsx'
import Games        from './pages/Games.jsx'
import GameDetail   from './pages/GameDetail.jsx'
import NewGame      from './pages/NewGame.jsx'
import Players      from './pages/Players.jsx'
import Settlements  from './pages/Settlements.jsx'
import NotFound     from './pages/NotFound.jsx'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function GroupRoute({ children }) {
  const { activeGroup } = useGroup()
  return activeGroup ? children : <Navigate to="/groups" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <GroupProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                fontSize: '14px',
                maxWidth: '340px',
              },
              success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Group picker — full-screen, outside Layout */}
            <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />

            {/* Main app — inside Layout */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/games" replace />} />
              <Route path="games"       element={<GroupRoute><Games /></GroupRoute>} />
              <Route path="games/new"   element={<GroupRoute><NewGame /></GroupRoute>} />
              <Route path="games/:id"   element={<GroupRoute><GameDetail /></GroupRoute>} />
              <Route path="players"     element={<GroupRoute><Players /></GroupRoute>} />
              <Route path="settlements" element={<GroupRoute><Settlements /></GroupRoute>} />
              <Route path="groups/:id"  element={<GroupDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GroupProvider>
    </AuthProvider>
  )
}
