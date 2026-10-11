import { useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

const LIMIT = 6

// Lista única de alertas (derivados em utils/alerts.js): um item por condição, sem repetição.
export default function AlertsPanel({ alerts }) {
  const [showAll, setShowAll] = useState(false)
  if (alerts.length === 0) return null
  const shown = showAll ? alerts : alerts.slice(0, LIMIT)
  const danger = alerts.filter((a) => a.severity === 'danger').length
  return (
    <section aria-label="Alertas" className="alerts alerts--list">
      <h2 className="alerts__title">{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}{danger ? ` · ${danger} ${danger === 1 ? 'crítico' : 'críticos'}` : ''}</h2>
      <ul>
        {shown.map((a) => (
          <li key={a.key} className={`alert alert--${a.severity}`}>
            {a.severity === 'danger' ? <AlertTriangle size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
            <span><strong>{a.label}:</strong> <a href={a.href}>{a.title}</a> <span className="alert__detail">— {a.detail}</span></span>
          </li>
        ))}
      </ul>
      {alerts.length > LIMIT && <button type="button" className="linklike" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostrar menos' : `Ver todos (${alerts.length})`}</button>}
    </section>
  )
}
