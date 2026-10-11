import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { ALERT_TYPES } from '../../utils/alerts.js'

const LIMIT = 6

// Central de alertas: um item por condição (utils/alerts.js). Cada item explica o MOTIVO, leva ao REGISTRO
// e diz qual AÇÃO resolve. Também mostra estados claros: carregando, falha parcial e "tudo em dia".
export default function AlertsPanel({ alerts, state, disabled = [] }) {
  const [showAll, setShowAll] = useState(false)
  const { failed, loading, ready } = state
  const shown = showAll ? alerts : alerts.slice(0, LIMIT)
  const danger = alerts.filter((a) => a.severity === 'danger').length
  const off = ALERT_TYPES.filter((a) => disabled.includes(a.id))

  return (
    <section aria-label="Alertas" className={`alerts alerts--list ${alerts.length === 0 && ready ? 'alerts--ok' : ''}`}>
      {failed.length > 0 && (
        <p className="alerts__note" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> Não foi possível carregar: {failed.join(', ')}. Os alertas abaixo podem estar incompletos.
        </p>
      )}
      {loading && alerts.length === 0 && failed.length === 0 && <p className="alerts__note" role="status">Verificando alertas…</p>}
      {loading && alerts.length > 0 && <p className="alerts__note" role="status">Ainda carregando dados: a lista pode crescer.</p>}

      {alerts.length > 0 && (
        <>
          <h2 className="alerts__title">{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}{danger ? ` · ${danger} ${danger === 1 ? 'crítico' : 'críticos'}` : ''}</h2>
          <ul>
            {shown.map((a) => (
              <li key={a.key} className={`alert alert--${a.severity}`}>
                {a.severity === 'danger' ? <AlertTriangle size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
                <span>
                  <strong>{a.label}:</strong> <a href={a.href}>{a.title}</a> <span className="alert__detail">— {a.detail}</span>
                  <br /><a className="alert__action" href={a.href} aria-label={`${a.action}: ${a.title}`}>{a.action} →</a>
                </span>
              </li>
            ))}
          </ul>
          {alerts.length > LIMIT && <button type="button" className="linklike" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostrar menos' : `Ver todos (${alerts.length})`}</button>}
        </>
      )}

      {alerts.length === 0 && ready && (
        <p className="alerts__ok" role="status"><CheckCircle2 size={14} aria-hidden="true" /> Nenhum alerta no momento. Verificamos prazos de tarefas e projetos, projetos aguardando cliente, propostas e lançamentos vencidos.</p>
      )}
      {off.length > 0 && <p className="alerts__note">Alertas desligados: {off.map((a) => a.label.toLowerCase()).join(', ')}. <a href="#/configuracoes">Ajustar</a></p>}
    </section>
  )
}
