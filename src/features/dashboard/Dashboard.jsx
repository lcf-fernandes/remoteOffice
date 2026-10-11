import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import Card from '../../components/Card.jsx'
import ProgressBar from '../../components/ProgressBar.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import DayTimeline from './DayTimeline.jsx'
import ContextSwitcher from '../preferences/ContextSwitcher.jsx'
import { usePreferences } from '../preferences/PreferencesProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useEvents } from '../events/EventsProvider.jsx'
import { useNotes } from '../notes/NotesProvider.jsx'
import { useWorkLogEditor } from '../notes/WorkLogEditor.jsx'
import { LogSections } from '../notes/NotesPage.jsx'
import { useProposals } from '../proposals/ProposalsProvider.jsx'
import useFollowUpDays from '../proposals/useFollowUpDays.js'
import { useTransactions } from '../finance/TransactionsProvider.jsx'
import { sortWorkLog } from '../../utils/notes.js'
import { followUpReason } from '../../utils/proposals.js'
import { eventErrorMessage } from '../../services/events.js'
import { localTimeZone } from '../../utils/events.js'
import { startOfDay } from '../../utils/agenda.js'
import { effectiveStatus, overdueTransactions } from '../../utils/finance.js'
import { greeting, formatLongDate, formatDate, formatMoney, relativeDay, daysFromToday } from '../../utils/format.js'
import { PRIORITY_LABEL, filterTasks, isOverdue, sortTasks } from '../../utils/tasks.js'
import { EMPTY_PROGRESS, attentionReason, isOpenProject, linkLabel, progressByProject, projectIsLate, sortProjects } from '../../utils/projects.js'
import { CONTEXTS, contextTasks, layoutFor, projectsOfType, repoLinks, videoQueue } from '../../utils/contexts.js'
import { BLOCK_IDS } from '../../utils/preferences.js'
import { taskErrorMessage } from '../../services/tasks.js'
import { projectErrorMessage } from '../../services/projects.js'

// Todos os blocos leem os mesmos dados reais das telas de cada módulo. O CONTEXTO só escolhe quais blocos ficam
// em destaque, em que ordem, e filtra tarefas/projetos: nada é copiado nem criado.
export default function Dashboard() {
  const { prefs } = usePreferences()
  const { status, tasks, error, retry } = useTasks()
  const { status: pStatus, projects, byId: projectsById, error: pError, retry: pRetry } = useProjects()
  const { clients, byId: clientsById } = useClients()
  const ev = useEvents()
  const notesCtx = useNotes()
  const logEditor = useWorkLogEditor()
  const { proposals } = useProposals()
  const [followDays] = useFollowUpDays()
  const { transactions } = useTransactions()

  const ctxId = prefs.context
  const open = filterTasks(tasks, { view: 'open' })
  const overdue = open.filter(isOverdue)
  const progress = useMemo(() => progressByProject(tasks), [tasks])
  const openProjects = projects.filter(isOpenProject)
  const dueSoon = openProjects.filter((p) => p.dueDate && daysFromToday(p.dueDate) <= 7)
  const lateProjects = openProjects.filter(projectIsLate)
  const attention = sortProjects(projects.filter((p) => attentionReason(p)))
  const followUps = proposals.map((p) => ({ p, reason: followUpReason(p, { days: followDays }) })).filter((x) => x.reason)
  const overdueTx = overdueTransactions(transactions)
  const overdueIncome = overdueTx.filter((t) => t.type === 'income').length
  const overdueExpense = overdueTx.length - overdueIncome
  const projectsReady = pStatus === 'ready'
  const lastLog = sortWorkLog(notesCtx.workLog)[0] ?? null
  const todayStart = startOfDay(new Date()).getTime()
  const todayEvents = ev.events.filter((e) => startOfDay(e.start).getTime() === todayStart).sort((a, b) => a.start - b.start)
  const timedToday = todayEvents.filter((e) => !e.allDay).map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end ?? new Date(e.start.getTime() + 30 * 60000) }))
  const allDayToday = todayEvents.filter((e) => e.allDay)
  const ctxTasks = sortTasks(contextTasks(ctxId, tasks, projectsById)).slice(0, 5)
  const taskFilterType = CONTEXTS[ctxId].taskProjectType
  const devProjects = sortProjects(projectsOfType(projects, 'development'))
  const queue = videoQueue(projects)
  const pendingTx = transactions.filter((t) => t.status === 'pending').sort((a, b) => a.dueDate - b.dueDate).slice(0, 5)
  const clientActions = clients.filter((c) => c.status !== 'archived' && c.nextActionDate && daysFromToday(c.nextActionDate) <= 0).sort((a, b) => a.nextActionDate - b.nextActionDate)
  const clientName = (p) => (p.clientId && clientsById[p.clientId] ? <span className="row__meta"> · {clientsById[p.clientId].name}</span> : null)

  const blocks = {
    agenda: (
      <Card key="agenda" title="Linha do dia" hint={`Eventos de hoje, das 08h às 20h (fuso ${localTimeZone()})`} id="d-dia" action={<a href="#/agenda">Abrir agenda</a>}>
        {ev.status === 'loading' && <LoadingState label="Carregando agenda…" />}
        {ev.status === 'error' && <ErrorState title="Não foi possível carregar a agenda" onRetry={ev.retry}>{eventErrorMessage(ev.error)}</ErrorState>}
        {ev.status === 'ready' && todayEvents.length === 0 && <EmptyState title="Nada agendado para hoje" action={<a href="#/agenda">Ir para a agenda</a>}>Eventos criados na Agenda aparecem aqui.</EmptyState>}
        {ev.status === 'ready' && todayEvents.length > 0 && <DayTimeline events={timedToday} allDay={allDayToday} />}
      </Card>
    ),

    tasks: (
      <Card key="tasks" title={taskFilterType === 'development' ? 'Tarefas de desenvolvimento' : taskFilterType === 'editing' ? 'Tarefas de edição' : 'Prioridades'}
        hint={taskFilterType ? `Tarefas abertas dos projetos do tipo ${taskFilterType === 'development' ? 'Desenvolvimento' : 'Edição'}, por prazo` : 'Próximas tarefas abertas por prazo'} id="d-prior" action={<a href="#/tarefas">Ver todas as tarefas</a>}>
        {status === 'loading' && <LoadingState label="Carregando tarefas…" />}
        {status === 'error' && <ErrorState title="Não foi possível carregar as tarefas" onRetry={retry}>{taskErrorMessage(error)}</ErrorState>}
        {status === 'ready' && ctxTasks.length === 0 && (
          <EmptyState title={taskFilterType ? 'Nenhuma tarefa aberta neste contexto' : 'Nenhuma tarefa aberta'} action={<a href="#/tarefas">Ir para Tarefas</a>}>
            {taskFilterType ? 'Só aparecem tarefas vinculadas a projetos desse tipo; as demais continuam em Tarefas.' : 'Crie uma tarefa para ela aparecer aqui.'}
          </EmptyState>
        )}
        {status === 'ready' && ctxTasks.length > 0 && (
          <ul className="rows">
            {ctxTasks.map((t) => (
              <li key={t.id} className="row">
                <div>
                  <p className="row__title">{t.title}</p>
                  <p className="row__meta">{t.due ? `prazo ${relativeDay(t.due)}` : 'sem prazo'}{t.projectId && projectsById[t.projectId] ? ` · ${projectsById[t.projectId].name}` : t.category ? ` · ${t.category}` : ''} · prioridade {PRIORITY_LABEL[t.priority].toLowerCase()}</p>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),

    projects: ctxId === 'development' ? (
      <Card key="projects" title="Projetos técnicos" hint="Projetos de desenvolvimento em andamento, com links de repositório" id="d-proj" action={<a href="#/projetos">Ver todos</a>}>
        {pStatus === 'loading' && <LoadingState label="Carregando projetos…" />}
        {pStatus === 'error' && <ErrorState title="Não foi possível carregar os projetos" onRetry={pRetry}>{projectErrorMessage(pError)}</ErrorState>}
        {projectsReady && devProjects.length === 0 && <EmptyState title="Nenhum projeto de desenvolvimento em andamento" action={<a href="#/projetos">Ir para Projetos</a>}>Crie um projeto do tipo Desenvolvimento.</EmptyState>}
        {projectsReady && devProjects.length > 0 && (
          <ul className="rows">
            {devProjects.map((p) => (
              <li key={p.id} className="row">
                <div className="row__grow">
                  <p className="row__title"><a className="pcard__title" href={`#/projetos/${p.id}`}>{p.name}</a>{clientName(p)}</p>
                  <p className="row__meta">{p.dueDate ? `prazo ${relativeDay(p.dueDate)}` : 'sem prazo'}</p>
                  {repoLinks(p).length > 0 && (
                    <p className="row__meta links-inline">{repoLinks(p).map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer">{linkLabel(l)} <ExternalLink size={12} aria-hidden="true" /></a>)}</p>
                  )}
                  <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    ) : (
      <Card key="projects" title="Projetos que pedem atenção" hint="Prazo vencido, aguardando cliente ou entrega em até 7 dias" id="d-proj" action={<a href="#/projetos">Ver todos</a>}>
        {pStatus === 'loading' && <LoadingState label="Carregando projetos…" />}
        {pStatus === 'error' && <ErrorState title="Não foi possível carregar os projetos" onRetry={pRetry}>{projectErrorMessage(pError)}</ErrorState>}
        {projectsReady && attention.length === 0 && <EmptyState title="Nenhum projeto pedindo atenção" />}
        {projectsReady && attention.length > 0 && (
          <ul className="rows">
            {attention.map((p) => (
              <li key={p.id} className="row">
                <div className="row__grow">
                  <p className="row__title"><a className="pcard__title" href={`#/projetos/${p.id}`}>{p.name}</a>{clientName(p)}</p>
                  <p className="row__meta">{attentionReason(p)}</p>
                  <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),

    video: (
      <Card key="video" title="Fila de vídeos" hint="Projetos de edição em andamento: produção, revisão e entrega" id="d-video" action={<a href="#/projetos">Ver projetos</a>}>
        {pStatus === 'loading' && <LoadingState label="Carregando projetos…" />}
        {projectsReady && queue.every((ph) => ph.projects.length === 0) && <EmptyState title="Nenhum projeto de edição em andamento" action={<a href="#/projetos">Ir para Projetos</a>}>Crie um projeto do tipo Edição para montar a fila.</EmptyState>}
        {projectsReady && queue.some((ph) => ph.projects.length > 0) && queue.map((phase) => (
          <section key={phase.id} aria-label={phase.label} className="phase">
            <h3 className="phase__title">{phase.label} <span className="row__meta">{phase.projects.length}</span></h3>
            {phase.projects.length === 0 ? <p className="row__meta">Nenhum projeto</p> : (
              <ul className="rows">
                {phase.projects.map((p) => (
                  <li key={p.id} className="row">
                    <div className="row__grow">
                      <p className="row__title"><a className="pcard__title" href={`#/projetos/${p.id}`}>{p.name}</a>{clientName(p)}</p>
                      <p className={`row__meta ${projectIsLate(p) ? 'is-late' : ''}`}>{p.dueDate ? `entrega ${formatDate(p.dueDate)} (${relativeDay(p.dueDate)})` : 'sem data de entrega'}</p>
                      <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </Card>
    ),

    resume: (
      <Card key="resume" title="Retomar" hint="Seu último registro de trabalho" id="d-resume" action={<a href="#/notas">Ver registros</a>}>
        {notesCtx.status === 'loading' && <LoadingState label="Carregando…" />}
        {notesCtx.status === 'ready' && !lastLog && <EmptyState title="Nenhum registro de trabalho ainda" action={<a href="#/notas">Ir para Notas</a>}>Registre o que fez, os bloqueios e o próximo passo.</EmptyState>}
        {lastLog && (
          <>
            <p className="row__meta"><button type="button" className="linklike" onClick={() => logEditor.openEdit(lastLog)}>{formatDate(lastLog.date, { weekday: 'long', day: '2-digit', month: 'long' })}</button></p>
            <LogSections entry={lastLog} />
          </>
        )}
      </Card>
    ),

    proposals: (
      <Card key="proposals" title="Propostas para retomar" hint="Próxima ação, validade vencida ou sem retorno" id="d-prop" action={<a href="#/comercial">Ver comercial</a>}>
        {followUps.length === 0 ? <EmptyState title="Nenhuma proposta pedindo retorno" action={<a href="#/comercial">Ir para Comercial</a>} /> : (
          <ul className="rows">
            {followUps.slice(0, 5).map(({ p, reason }) => (
              <li key={p.id} className="row">
                <div><a className="pcard__title" href={`#/comercial/${p.id}`}>{p.title}</a><p className="row__meta">{reason.text}</p></div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),

    finance: (
      <Card key="finance" title="A receber e a pagar" hint="Lançamentos pendentes por vencimento (moedas nunca somadas)" id="d-fin" action={<a href="#/financeiro">Ver financeiro</a>}>
        {pendingTx.length === 0 ? <EmptyState title="Nada pendente" action={<a href="#/financeiro">Ir para Financeiro</a>} /> : (
          <ul className="rows">
            {pendingTx.map((t) => (
              <li key={t.id} className="row">
                <div>
                  <p className="row__title">{t.description}</p>
                  <p className={`row__meta ${effectiveStatus(t) === 'overdue' ? 'is-late' : ''}`}>{t.type === 'income' ? 'A receber' : 'A pagar'} · {effectiveStatus(t) === 'overdue' ? `vencida (${formatDate(t.dueDate)})` : `vence ${relativeDay(t.dueDate)}`}</p>
                </div>
                <strong>{t.type === 'income' ? '+' : '−'} {formatMoney(t.amount, t.currency)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),

    clients: (
      <Card key="clients" title="Clientes: próximas ações" hint="Ações com data de hoje ou vencidas" id="d-cli" action={<a href="#/clientes">Ver clientes</a>}>
        {clientActions.length === 0 ? <EmptyState title="Nenhuma ação de cliente para hoje" action={<a href="#/clientes">Ir para Clientes</a>} /> : (
          <ul className="rows">
            {clientActions.slice(0, 5).map((c) => (
              <li key={c.id} className="row">
                <div>
                  <a className="pcard__title" href={`#/clientes/${c.id}`}>{c.name}</a>
                  <p className={`row__meta ${daysFromToday(c.nextActionDate) < 0 ? 'is-late' : ''}`}>{c.nextAction || 'Próxima ação'} · {relativeDay(c.nextActionDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),
  }

  const { primary, secondary } = layoutFor(ctxId, BLOCK_IDS, prefs.hiddenBlocks)

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">{greeting()}, Leandro</h1>
          <p className="dash-date">{formatLongDate()}</p>
        </div>
      </header>

      <ContextSwitcher />

      <dl className="stats">
        <div><dt>Tarefas abertas</dt><dd>{status === 'ready' ? open.length : '—'}</dd></div>
        <div><dt>Projetos com entrega em 7 dias</dt><dd>{projectsReady ? dueSoon.length : '—'}</dd></div>
        <div><dt>Projetos em andamento</dt><dd>{projectsReady ? openProjects.length : '—'}</dd></div>
      </dl>

      {(overdue.length > 0 || lateProjects.length > 0 || followUps.length > 0 || overdueTx.length > 0) && (
        <section aria-label="Alertas" className="alerts">
          {overdue.length > 0 && <p><strong>{overdue.length}</strong> {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.</p>}
          {lateProjects.length > 0 && <p><strong>{lateProjects.length}</strong> {lateProjects.length === 1 ? 'projeto com prazo vencido' : 'projetos com prazo vencido'}.</p>}
          {followUps.length > 0 && <p><strong>{followUps.length}</strong> {followUps.length === 1 ? 'proposta pede retorno' : 'propostas pedem retorno'} (<a href="#/comercial">ver</a>).</p>}
          {overdueIncome > 0 && <p><strong>{overdueIncome}</strong> {overdueIncome === 1 ? 'recebimento vencido' : 'recebimentos vencidos'} (<a href="#/financeiro">ver</a>).</p>}
          {overdueExpense > 0 && <p><strong>{overdueExpense}</strong> {overdueExpense === 1 ? 'conta a pagar vencida' : 'contas a pagar vencidas'} (<a href="#/financeiro">ver</a>).</p>}
        </section>
      )}

      {primary.map((id) => <div key={id} className="block block--primary">{blocks[id]}</div>)}

      {secondary.length > 0 && (
        <details className="more-blocks">
          <summary>Outros blocos ({secondary.length})</summary>
          <div className="more-blocks__body">{secondary.map((id) => <div key={id} className="block">{blocks[id]}</div>)}</div>
        </details>
      )}
    </div>
  )
}
