import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ss_token'))

  const login = (jwt) => {
    localStorage.setItem('ss_token', jwt)
    setToken(jwt)
  }

  const logout = () => {
    localStorage.removeItem('ss_token')
    localStorage.removeItem('ss_active_group')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
