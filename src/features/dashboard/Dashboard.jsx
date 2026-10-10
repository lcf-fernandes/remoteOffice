import { useMemo } from 'react'
import Card from '../../components/Card.jsx'
import ProgressBar from '../../components/ProgressBar.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import DayTimeline from './DayTimeline.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useEvents } from '../events/EventsProvider.jsx'
import { useProposals } from '../proposals/ProposalsProvider.jsx'
import useFollowUpDays from '../proposals/useFollowUpDays.js'
import { followUpReason } from '../../utils/proposals.js'
import { eventErrorMessage } from '../../services/events.js'
import { localTimeZone } from '../../utils/events.js'
import { startOfDay } from '../../utils/agenda.js'
import { demo } from '../../dev/fixtures.js'
import { greeting, formatLongDate, relativeDay, daysFromToday } from '../../utils/format.js'
import { PRIORITY_LABEL, filterTasks, isOverdue, sortTasks } from '../../utils/tasks.js'
import { EMPTY_PROGRESS, attentionReason, isOpenProject, progressByProject, projectIsLate, sortProjects } from '../../utils/projects.js'
import { taskErrorMessage } from '../../services/tasks.js'
import { projectErrorMessage } from '../../services/projects.js'

// Tarefas, clientes e projetos são reais (mesmos serviços das telas de cada módulo).
// Só os pagamentos ainda usam dados de demonstração e estão marcados como tal.
export default function Dashboard() {
  const { status, tasks, error, retry } = useTasks()
  const { status: pStatus, projects, error: pError, retry: pRetry } = useProjects()
  const { byId: clientsById } = useClients()
  const ev = useEvents()
  const { proposals } = useProposals()
  const [followDays] = useFollowUpDays()
  const needFollowUp = proposals.filter((p) => followUpReason(p, { days: followDays }))

  const open = filterTasks(tasks, { view: 'open' })
  const overdue = open.filter(isOverdue)
  const prioritized = sortTasks(open).slice(0, 5)
  const progress = useMemo(() => progressByProject(tasks), [tasks])
  const openProjects = projects.filter(isOpenProject)
  const dueSoon = openProjects.filter((p) => p.dueDate && daysFromToday(p.dueDate) <= 7)
  const lateProjects = openProjects.filter(projectIsLate)
  const attention = sortProjects(projects.map((p) => ({ p, reason: attentionReason(p) })).filter((x) => x.reason).map((x) => x.p))
  const overduePayments = demo.payments.filter((t) => t.status === 'overdue')
  const projectsReady = pStatus === 'ready'
  const todayStart = startOfDay(new Date()).getTime()
  const todayEvents = ev.events.filter((e) => startOfDay(e.start).getTime() === todayStart).sort((a, b) => a.start - b.start)
  const timedToday = todayEvents.filter((e) => !e.allDay).map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end ?? new Date(e.start.getTime() + 30 * 60000) }))
  const allDayToday = todayEvents.filter((e) => e.allDay)

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">{greeting()}, Leandro</h1>
          <p className="dash-date">{formatLongDate()}</p>
        </div>
        <span className="demo-flag">Tarefas, clientes, projetos, agenda e propostas reais · financeiro em demonstração</span>
      </header>

      <dl className="stats">
        <div><dt>Tarefas abertas</dt><dd>{status === 'ready' ? open.length : '—'}</dd></div>
        <div><dt>Projetos com entrega em 7 dias</dt><dd>{projectsReady ? dueSoon.length : '—'}</dd></div>
        <div><dt>Projetos em andamento</dt><dd>{projectsReady ? openProjects.length : '—'}</dd></div>
      </dl>

      {(overdue.length > 0 || lateProjects.length > 0 || needFollowUp.length > 0 || overduePayments.length > 0) && (
        <section aria-label="Alertas" className="alerts">
          {overdue.length > 0 && <p><strong>{overdue.length}</strong> {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.</p>}
          {lateProjects.length > 0 && <p><strong>{lateProjects.length}</strong> {lateProjects.length === 1 ? 'projeto com prazo vencido' : 'projetos com prazo vencido'}.</p>}
          {needFollowUp.length > 0 && <p><strong>{needFollowUp.length}</strong> {needFollowUp.length === 1 ? 'proposta pede retorno' : 'propostas pedem retorno'} (<a href="#/comercial">ver</a>).</p>}
          {overduePayments.length > 0 && <p><strong>{overduePayments.length}</strong> {overduePayments.length === 1 ? 'pagamento vencido (demo)' : 'pagamentos vencidos (demo)'}.</p>}
        </section>
      )}

      <Card title="Linha do dia" hint={`Eventos de hoje, das 08h às 20h (fuso ${localTimeZone()})`} id="d-dia" action={<a href="#/agenda">Abrir agenda</a>}>
        {ev.status === 'loading' && <LoadingState label="Carregando agenda…" />}
        {ev.status === 'error' && <ErrorState title="Não foi possível carregar a agenda" onRetry={ev.retry}>{eventErrorMessage(ev.error)}</ErrorState>}
        {ev.status === 'ready' && todayEvents.length === 0 && <EmptyState title="Nada agendado para hoje" action={<a href="#/agenda">Ir para a agenda</a>}>Eventos criados na Agenda aparecem aqui.</EmptyState>}
        {ev.status === 'ready' && todayEvents.length > 0 && <DayTimeline events={timedToday} allDay={allDayToday} />}
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

      <Card title="Projetos que pedem atenção" hint="Prazo vencido, aguardando cliente ou entrega em até 7 dias" id="d-proj" action={<a href="#/projetos">Ver todos</a>}>
        {pStatus === 'loading' && <LoadingState label="Carregando projetos…" />}
        {pStatus === 'error' && <ErrorState title="Não foi possível carregar os projetos" onRetry={pRetry}>{projectErrorMessage(pError)}</ErrorState>}
        {projectsReady && attention.length === 0 && <EmptyState title="Nenhum projeto pedindo atenção" />}
        {projectsReady && attention.length > 0 && (
          <ul className="rows">
            {attention.map((p) => (
              <li key={p.id} className="row">
                <div className="row__grow">
                  <p className="row__title">
                    <a className="pcard__title" href={`#/projetos/${p.id}`}>{p.name}</a>
                    {p.clientId && clientsById[p.clientId] ? <span className="row__meta"> · {clientsById[p.clientId].name}</span> : null}
                  </p>
                  <p className="row__meta">{attentionReason(p)}</p>
                  <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
