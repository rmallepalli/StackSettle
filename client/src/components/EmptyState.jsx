export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-100 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
