import Card from '../../components/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import DayTimeline from './DayTimeline.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { demo } from '../../dev/fixtures.js'
import { greeting, formatLongDate, relativeDay, daysFromToday } from '../../utils/format.js'
import { PRIORITY_LABEL, filterTasks, isOverdue, sortTasks } from '../../utils/tasks.js'
import { taskErrorMessage } from '../../services/tasks.js'

// Tarefas vêm do Firestore (mesmo serviço do módulo Tarefas). Agenda, projetos e pagamentos
// ainda usam dados de demonstração e estão marcados como tal até seus módulos existirem.
export default function Dashboard() {
  const { status, tasks, error, retry } = useTasks()
  const open = filterTasks(tasks, { view: 'open' })
  const overdue = open.filter(isOverdue)
  const prioritized = sortTasks(open).slice(0, 5)
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
        <span className="demo-flag">Tarefas reais · demais blocos em demonstração</span>
      </header>

      <dl className="stats">
        <div><dt>Tarefas abertas</dt><dd>{status === 'ready' ? open.length : '—'}</dd></div>
        <div><dt>Entregas em 7 dias (demo)</dt><dd>{dueSoon.length}</dd></div>
        <div><dt>Projetos ativos (demo)</dt><dd>{demo.projects.length}</dd></div>
      </dl>

      {(overdue.length > 0 || overduePayments.length > 0) && (
        <section aria-label="Alertas" className="alerts">
          {overdue.length > 0 && <p><strong>{overdue.length}</strong> {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.</p>}
          {overduePayments.length > 0 && <p><strong>{overduePayments.length}</strong> {overduePayments.length === 1 ? 'pagamento vencido (demo)' : 'pagamentos vencidos (demo)'}.</p>}
        </section>
      )}

      <Card title="Linha do dia" hint="Demonstração — a agenda real chega no commit 13" id="d-dia">
        {demo.agenda.length ? <DayTimeline events={demo.agenda} /> : <EmptyState title="Nada agendado para hoje" />}
      </Card>

      <Card title="Prioridades" hint="Próximas tarefas abertas por prazo" id="d-prior" action={<a href="#/tarefas">Ver todas</a>}>
        {status === 'loading' && <LoadingState label="Carregando tarefas…" />}
        {status === 'error' && <ErrorState title="Não foi possível carregar as tarefas" onRetry={retry}>{taskErrorMessage(error)}</ErrorState>}
        {status === 'ready' && prioritized.length === 0 && (
          <EmptyState title="Nenhuma tarefa aberta" action={<a href="#/tarefas">Ir para Tarefas</a>}>Crie uma tarefa para ela aparecer aqui.</EmptyState>
        )}
        {status === 'ready' && prioritized.length > 0 && (
          <ul className="rows">
            {prioritized.map((t) => (
              <li key={t.id} className="row">
                <div>
                  <p className="row__title">{t.title}</p>
                  <p className="row__meta">
                    {t.due ? `prazo ${relativeDay(t.due)}` : 'sem prazo'}{t.category ? ` · ${t.category}` : ''} · prioridade {PRIORITY_LABEL[t.priority].toLowerCase()}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Projetos que pedem atenção" hint="Demonstração — projetos reais chegam no commit 12" id="d-proj">
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
