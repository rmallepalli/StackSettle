import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../utils/api.js'

export default function Login() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { pin })
      login(data.token)
      navigate('/games')
    } catch {
      toast.error('Invalid PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">♠</div>
          <h1 className="text-3xl font-bold text-gray-900">StackSettle</h1>
          <p className="text-gray-500 mt-1">Enter your PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input text-center text-2xl tracking-widest"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={8}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={loading || !pin}
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
