import Card from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { EmptyState } from '../components/states.jsx'
import { formatMoney, relativeDay } from '../utils/format.js'
import { demo } from '../dev/fixtures.js'
import { useProjects } from '../features/projects/ProjectsProvider.jsx'
import { isOpenProject, sortProjects, projectIsLate } from '../utils/projects.js'
import { useClients } from '../features/clients/ClientsProvider.jsx'
import { useTasks } from '../features/tasks/TasksProvider.jsx'
import { useEvents } from '../features/events/EventsProvider.jsx'
import { KIND_LABEL, buildAgendaItems, addDays, startOfDay } from '../utils/agenda.js'

export default function RightPanel() {
  const { status, projects } = useProjects()
  const { byId: clientsById } = useClients()
  const { tasks } = useTasks()
  const ev = useEvents()
  const upcoming = sortProjects(projects.filter((p) => isOpenProject(p) && p.dueDate))
  const limit = addDays(startOfDay(new Date()), 29)
  const deliveries = buildAgendaItems({ events: ev.events.filter((e) => e.type === 'milestone'), tasks, projects })
    .filter((i) => startOfDay(i.start) <= limit).slice(0, 6)
  const focus = upcoming[0] ?? null
  return (
    <div className="right">
      <Card title="Em foco" id="r-foco" hint="Projeto em andamento com o prazo mais próximo">
        {status === 'loading' && <p className="right__muted">Carregando…</p>}
        {status === 'ready' && !focus && <p className="right__muted">Nenhum projeto em andamento com prazo.</p>}
        {focus && (
          <>
            <a className="pcard__title" href={`#/projetos/${focus.id}`}>{focus.name}</a>
            <p className="right__muted">{focus.clientId && clientsById[focus.clientId] ? clientsById[focus.clientId].name : 'Sem cliente'}</p>
            <div className="right__row"><StatusBadge status={focus.status} /><span className={`right__muted ${projectIsLate(focus) ? 'is-late' : ''}`}>entrega {relativeDay(focus.dueDate)}</span></div>
          </>
        )}
      </Card>

      <Card title="Próximas entregas" id="r-entregas" hint="Prazos de tarefas e projetos e marcos (próximos 30 dias e vencidos)">
        {deliveries.length === 0 && status === 'ready' && <p className="right__muted">Nenhuma entrega com prazo.</p>}
        <ul className="right__list">
          {deliveries.map((i) => (
            <li key={i.key}>
              <span>
                {i.kind === 'project' ? <a href={`#/projetos/${i.ref.id}`}>{i.title}</a> : i.title}
                <span className="right__muted"> · {i.kind === 'event' ? 'Marco' : KIND_LABEL[i.kind]}</span>
              </span>
              <span className={`right__muted ${startOfDay(i.start) < startOfDay(new Date()) ? 'is-late' : ''}`}>{relativeDay(i.start)}</span>
            </li>
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
