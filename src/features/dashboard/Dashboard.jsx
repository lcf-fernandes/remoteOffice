import Card from '../../components/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState } from '../../components/states.jsx'
import DayTimeline from './DayTimeline.jsx'
import { demo } from '../../dev/fixtures.js'
import { greeting, formatLongDate, relativeDay, daysFromToday } from '../../utils/format.js'

const PRIORITY = { high: 'Alta', medium: 'Média', low: 'Baixa' }

export default function Dashboard() {
  const open = demo.tasks.filter((t) => !['done', 'cancelled'].includes(t.status))
  const overdue = open.filter((t) => daysFromToday(t.due) < 0)
  const prioritized = [...open].sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 4)
  const attention = demo.projects.filter((p) => p.attention)
  const dueSoon = demo.projects.filter((p) => daysFromToday(p.due) <= 7)
  const overduePayments = demo.payments.filter((t) => t.status === 'overdue')

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">{greeting()}, Leandro</h1>
          <p className="dash-date">{formatLongDate()}</p>
        </div>
        <span className="demo-flag">Dados de demonstração</span>
      </header>

      <dl className="stats">
        <div><dt>Tarefas abertas</dt><dd>{open.length}</dd></div>
        <div><dt>Entregas em 7 dias</dt><dd>{dueSoon.length}</dd></div>
        <div><dt>Projetos ativos</dt><dd>{demo.projects.length}</dd></div>
      </dl>

      {(overdue.length > 0 || overduePayments.length > 0) && (
        <section aria-label="Alertas" className="alerts">
          {overdue.length > 0 && <p><strong>{overdue.length}</strong> {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.</p>}
          {overduePayments.length > 0 && <p><strong>{overduePayments.length}</strong> {overduePayments.length === 1 ? 'pagamento vencido' : 'pagamentos vencidos'}.</p>}
        </section>
      )}

      <Card title="Linha do dia" hint="Compromissos de hoje, das 08h às 20h" id="d-dia">
        {demo.agenda.length ? <DayTimeline events={demo.agenda} /> : <EmptyState title="Nada agendado para hoje" />}
      </Card>

      <Card title="Prioridades" hint="Próximas tarefas por prazo" id="d-prior">
        <ul className="rows">
          {prioritized.map((t) => (
            <li key={t.id} className="row">
              <div>
                <p className="row__title">{t.title}</p>
                <p className="row__meta">{t.project} · prazo {relativeDay(t.due)} · prioridade {PRIORITY[t.priority].toLowerCase()}</p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Projetos que pedem atenção" id="d-proj">
        {attention.length ? (
          <ul className="rows">
            {attention.map((p) => (
              <li key={p.id} className="row">
                <div className="row__grow">
                  <p className="row__title">{p.name} <span className="row__meta">· {p.client}</span></p>
                  <p className="row__meta">{p.attention}</p>
                  <div className="progress" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${p.name}`}>
                    <span style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum projeto parado" />
        )}
      </Card>
    </div>
  )
}
