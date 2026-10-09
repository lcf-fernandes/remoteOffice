import Card from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { EmptyState } from '../components/states.jsx'
import { formatMoney, relativeDay } from '../utils/format.js'
import { demo } from '../dev/fixtures.js'

export default function RightPanel() {
  const focus = demo.projects[0]
  const deliveries = [...demo.projects].sort((a, b) => new Date(a.due) - new Date(b.due))
  return (
    <div className="right">
      <Card title="Em foco" id="r-foco">
        <p className="right__strong">{focus.name}</p>
        <p className="right__muted">{focus.client}</p>
        <div className="right__row"><StatusBadge status={focus.status} /><span className="right__muted">entrega {relativeDay(focus.due)}</span></div>
      </Card>

      <Card title="Próximas entregas" id="r-entregas">
        <ul className="right__list">
          {deliveries.map((p) => (
            <li key={p.id}><span>{p.name}</span><span className="right__muted">{relativeDay(p.due)}</span></li>
          ))}
        </ul>
      </Card>

      <Card title="Propostas para retomar" id="r-propostas">
        <ul className="right__list">
          {demo.proposals.map((p) => (
            <li key={p.id}>
              <span>{p.title}<span className="right__muted"> · {p.client}</span></span>
              <span className="right__muted">{relativeDay(p.followUp)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Pagamentos" id="r-pagamentos">
        <ul className="right__list">
          {demo.payments.map((t) => (
            <li key={t.id}>
              <span>{t.description}</span>
              <span><strong>{formatMoney(t.amount, t.currency)}</strong> <StatusBadge status={t.status} /></span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Cronômetro" id="r-timer">
        <EmptyState title="Disponível no commit 16">Registro de tempo por tarefa e projeto.</EmptyState>
      </Card>
    </div>
  )
}
