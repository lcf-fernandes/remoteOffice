import Card from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { EmptyState } from '../components/states.jsx'
import { formatMoney, relativeDay } from '../utils/format.js'
import { useTransactions } from '../features/finance/TransactionsProvider.jsx'
import { effectiveStatus } from '../utils/finance.js'
import { useTime } from '../features/time/TimeProvider.jsx'
import useNow from '../features/time/useNow.js'
import { formatClock } from '../utils/time.js'
import { useProjects } from '../features/projects/ProjectsProvider.jsx'
import { isOpenProject, sortProjects, projectIsLate } from '../utils/projects.js'
import { useClients } from '../features/clients/ClientsProvider.jsx'
import { useTasks } from '../features/tasks/TasksProvider.jsx'
import { useEvents } from '../features/events/EventsProvider.jsx'
import { useProposals } from '../features/proposals/ProposalsProvider.jsx'
import useFollowUpDays from '../features/proposals/useFollowUpDays.js'
import { followUpReason } from '../utils/proposals.js'
import { KIND_LABEL, buildAgendaItems, addDays, startOfDay } from '../utils/agenda.js'

export default function RightPanel() {
  const { status, projects } = useProjects()
  const { byId: clientsById } = useClients()
  const { tasks } = useTasks()
  const time = useTime()
  const nowTick = useNow(!!time.timer)
  const ev = useEvents()
  const { status: proposalsStatus, proposals } = useProposals()
  const { status: txStatus, transactions } = useTransactions()
  const openTx = transactions.filter((t) => t.status === 'pending').sort((a, b) => a.dueDate - b.dueDate)
  const [followDays] = useFollowUpDays()
  const followUps = proposals.map((p) => ({ p, reason: followUpReason(p, { days: followDays }) })).filter((x) => x.reason)
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

      <Card title="Propostas para retomar" id="r-propostas" hint="Próxima ação, validade vencida ou sem retorno" action={<a href="#/comercial">Ver</a>}>
        {proposalsStatus === 'ready' && followUps.length === 0 && <p className="right__muted">Nenhuma proposta pedindo retorno.</p>}
        <ul className="right__list">
          {followUps.slice(0, 5).map(({ p, reason }) => (
            <li key={p.id}>
              <span><a href={`#/comercial/${p.id}`}>{p.title}</a><span className="right__muted"> · {reason.text}</span></span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="A receber e a pagar" id="r-pagamentos" hint="Lançamentos pendentes por vencimento (valores nunca somados entre moedas)" action={<a href="#/financeiro">Ver</a>}>
        {txStatus === 'ready' && openTx.length === 0 && <p className="right__muted">Nada pendente.</p>}
        <ul className="right__list">
          {openTx.slice(0, 5).map((t) => (
            <li key={t.id}>
              <span>{t.description}<span className="right__muted"> · {t.type === 'income' ? 'A receber' : 'A pagar'}</span></span>
              <span><strong>{formatMoney(t.amount, t.currency)}</strong> <span className={`right__muted ${effectiveStatus(t) === 'overdue' ? 'is-late' : ''}`}>{effectiveStatus(t) === 'overdue' ? 'vencida' : relativeDay(t.dueDate)}</span></span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Cronômetro" id="r-timer" action={<a href="#/tempo">Abrir</a>}>
        {time.status === 'loading' && <p className="right__muted">Carregando…</p>}
        {time.status === 'error' && <p className="right__muted">Não foi possível carregar o tempo.</p>}
        {time.status === 'ready' && !time.timer && <p className="right__muted">Nenhum cronômetro ativo. <a href="#/tempo">Iniciar</a></p>}
        {time.status === 'ready' && time.timer && (
          <>
            <p className="timer__clock timer__clock--small" role="timer">{formatClock((nowTick.getTime() - time.timer.start.getTime()) / 1000)}</p>
            <p className="right__muted">{time.timer.description || (time.timer.taskId && tasks.find((t) => t.id === time.timer.taskId)?.title) || 'Sem descrição'}</p>
            <p className="right__muted"><a href="#/tempo">Parar e registrar</a></p>
          </>
        )}
      </Card>
    </div>
  )
}
