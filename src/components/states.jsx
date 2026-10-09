import { AlertTriangle } from 'lucide-react'
import Button from './Button.jsx'

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Carregando…' }) {
  return <div className="state" role="status" aria-live="polite">{label}</div>
}

export function ErrorState({ title = 'Algo deu errado', children, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__title"><AlertTriangle size={14} aria-hidden="true" /> {title}</p>
      {children && <p>{children}</p>}
      {onRetry && <Button onClick={onRetry}>Tentar de novo</Button>}
    </div>
  )
}
