import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Pages (stubs — filled in subsequent steps)
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Games from './pages/Games.jsx'
import GameDetail from './pages/GameDetail.jsx'
import NewGame from './pages/NewGame.jsx'
import Players from './pages/Players.jsx'
import Settlements from './pages/Settlements.jsx'

// Auth guard
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px' },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/games" replace />} />
            <Route path="games" element={<Games />} />
            <Route path="games/new" element={<NewGame />} />
            <Route path="games/:id" element={<GameDetail />} />
            <Route path="players" element={<Players />} />
            <Route path="settlements" element={<Settlements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
