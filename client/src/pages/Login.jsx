import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../utils/api.js'

export default function Login() {
  const [pin, setPin]       = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]   = useState(false)
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
      toast.error('Incorrect PIN')
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 sm:bg-slate-950">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/50">
            <span className="text-white text-4xl leading-none">♠</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">StackSettle</h1>
          <p className="text-slate-500 mt-1 text-sm">Home poker settlement</p>
        </div>

        {/* Card */}
        <div className={`card shadow-md transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-center block">Enter PIN</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                className="input text-center tracking-[0.5em] font-bold"
                style={{ fontSize: '24px' }}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={8}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-3 text-base"
              disabled={loading || !pin}
            >
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          StackSettle · Home Game Tracker
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
