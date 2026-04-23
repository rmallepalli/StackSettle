import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
      <div className="text-6xl">♠</div>
      <h1 className="text-2xl font-bold text-slate-100">404</h1>
      <p className="text-slate-400">That page doesn't exist.</p>
      <button className="btn-primary" onClick={() => navigate('/games')}>
        Back to Games
      </button>
    </div>
  )
}
