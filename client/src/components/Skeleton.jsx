function Bone({ className = '' }) {
  return <div className={`animate-pulse bg-slate-700 rounded-lg ${className}`} />
}

export function GameCardSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-24" />
        </div>
        <Bone className="h-5 w-5 rounded-full" />
      </div>
      <div className="flex gap-4 pt-2 border-t border-slate-700">
        <div className="space-y-1.5"><Bone className="h-2.5 w-10" /><Bone className="h-4 w-6" /></div>
        <div className="space-y-1.5"><Bone className="h-2.5 w-14" /><Bone className="h-4 w-16" /></div>
      </div>
    </div>
  )
}

export function PlayerCardSkeleton() {
  return (
    <div className="card flex items-center gap-3 py-3">
      <Bone className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-3 w-24" />
        <div className="flex gap-1.5">
          <Bone className="h-5 w-14 rounded-full" />
          <Bone className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ Card = GameCardSkeleton, count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <Card key={i} />)}
    </div>
  )
}
