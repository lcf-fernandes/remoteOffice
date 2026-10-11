import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useTasks } from './TasksProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTime } from '../time/TimeProvider.jsx'
import { startTimer, timeErrorMessage } from '../../services/time.js'
import { useTaskEditor } from './TaskEditor.jsx'
import { deleteTask, setTaskStatus, taskErrorMessage } from '../../services/tasks.js'
import { PRIORITY_LABEL, PRIORITY_OPTIONS, STATUS_OPTIONS, VIEWS, filterTasks, isOverdue, sortTasks } from '../../utils/tasks.js'
import { formatDate, relativeDay } from '../../utils/format.js'

export function PriorityBadge({ priority }) {
  const tone = priority === 'high' ? 'danger' : priority === 'medium' ? 'warn' : 'neutral'
  return <span className={`badge badge--${tone}`}>{PRIORITY_LABEL[priority] ?? priority}</span>
}

export default function TasksPage({ openId = null }) {
  const { user } = useAuth()
  const { status, tasks, error, retry } = useTasks()
  const editor = useTaskEditor()
  const { byId: clientsById } = useClients()
  const { byId: projectsById } = useProjects()
  const time = useTime()
  const [filters, setFilters] = useState({ view: 'open', status: '', priority: '', search: '' })
  const [detailId, setDetailId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [missing, setMissing] = useState(false)

  // Link direto (#/tarefas/{id}, usado pelos alertas): abre a tarefa e limpa o endereço.
  useEffect(() => {
    if (!openId || status !== 'ready') return
    if (tasks.some((t) => t.id === openId)) { setDetailId(openId); setMissing(false) } else setMissing(true)
    window.location.replace('#/tarefas')
  }, [openId, status, tasks])

  const visible = useMemo(() => sortTasks(filterTasks(tasks, filters)), [tasks, filters])
  const detail = tasks.find((t) => t.id === detailId) ?? null
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  async function toggleDone(task) {
    setActionError('')
    try { await setTaskStatus(user.uid, task.id, task.status === 'done' ? 'todo' : 'done') }
    catch (err) { setActionError(taskErrorMessage(err)) }
  }

  async function startTaskTimer(task) {
    setActionError('')
    try { await startTimer(user.uid, { description: '', taskId: task.id, projectId: task.projectId ?? null }); setDetailId(null); window.location.hash = '#/tempo' }
    catch (err) { setActionError(timeErrorMessage(err)); setDetailId(null) }
  }

  async function confirmDelete() {
    setDeleting(true); setActionError('')
    try { await deleteTask(user.uid, toDelete.id); setToDelete(null) }
    catch (err) { setActionError(taskErrorMessage(err)) }
    setDeleting(false)
  }

  return (
    <div className="center__inner">
      <header className="dash-head">
        <h1 className="page-title">Tarefas</h1>
        <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Nova tarefa</Button>
      </header>

      <div className="filters">
        <div className="chips" role="group" aria-label="Visão">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className="chip" aria-pressed={filters.view === v.id} onClick={() => setFilters((f) => ({ ...f, view: v.id }))}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="filters__row">
          <Input label="Buscar" type="search" placeholder="Título, descrição, categoria ou tag" value={filters.search} onChange={setFilter('search')} />
          <Select label="Status" value={filters.status} onChange={setFilter('status')} options={[{ value: '', label: 'Todos' }, ...STATUS_OPTIONS]} />
          <Select label="Prioridade" value={filters.priority} onChange={setFilter('priority')} options={[{ value: '', label: 'Todas' }, ...PRIORITY_OPTIONS]} />
        </div>
      </div>

      {missing && <ErrorState title="Tarefa não encontrada">Ela pode ter sido excluída ou concluída em outro aparelho.</ErrorState>}
      {actionError && <ErrorState title="Não foi possível concluir a ação">{actionError}</ErrorState>}

      {status === 'loading' && <LoadingState label="Carregando tarefas…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar as tarefas" onRetry={retry}>{taskErrorMessage(error)}</ErrorState>}
      {status === 'ready' && visible.length === 0 && (
        tasks.length === 0
          ? <EmptyState title="Nenhuma tarefa ainda" action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Criar a primeira tarefa</Button>}>Anote o que precisa fazer e acompanhe aqui.</EmptyState>
          : <EmptyState title="Nenhuma tarefa encontrada">Ajuste a visão, a busca ou os filtros.</EmptyState>
      )}

      {status === 'ready' && visible.length > 0 && (
        <ul className="task-list">
          {visible.map((t) => (
            <li key={t.id} className="task">
              <button type="button" className={`task__check ${t.status === 'done' ? 'is-done' : ''}`} aria-label={t.status === 'done' ? `Reabrir: ${t.title}` : `Concluir: ${t.title}`} onClick={() => toggleDone(t)}>
                {t.status === 'done' && <Check size={14} aria-hidden="true" />}
              </button>
              <button type="button" className="task__main" onClick={() => setDetailId(t.id)}>
                <span className={`row__title ${t.status === 'done' ? 'is-struck' : ''}`}>{t.title}</span>
                <span className="row__meta">
                  {t.due ? <span className={isOverdue(t) ? 'is-late' : ''}>prazo {formatDate(t.due)} ({relativeDay(t.due)})</span> : 'sem prazo'}
                  {t.projectId && projectsById[t.projectId] ? ` · ${projectsById[t.projectId].name}` : ''}
                  {t.clientId && clientsById[t.clientId] ? ` · ${clientsById[t.clientId].name}` : ''}
                  {t.category ? ` · ${t.category}` : ''}
                  {t.tags.length ? ` · ${t.tags.map((x) => `#${x}`).join(' ')}` : ''}
                </span>
              </button>
              <span className="task__badges"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!detail}
        wide
        title={detail?.title ?? ''}
        onClose={() => setDetailId(null)}
        actions={detail && (
          <>
            <Button variant="ghost" icon={Trash2} onClick={() => { setToDelete(detail); setDetailId(null) }}>Excluir</Button>
            <Button icon={Play} onClick={() => startTaskTimer(detail)} disabled={!!time.timer} title={time.timer ? 'Já existe um cronômetro ativo' : undefined}>Iniciar cronômetro</Button>
            <Button icon={detail.status === 'done' ? RotateCcw : Check} onClick={() => toggleDone(detail)}>{detail.status === 'done' ? 'Reabrir' : 'Concluir'}</Button>
            <Button variant="primary" icon={Pencil} onClick={() => { const t = detail; setDetailId(null); editor.openEdit(t) }}>Editar</Button>
          </>
        )}
      >
        {detail && (
          <dl className="detail">
            <div><dt>Status</dt><dd><StatusBadge status={detail.status} /></dd></div>
            <div><dt>Prioridade</dt><dd><PriorityBadge priority={detail.priority} /></dd></div>
            <div><dt>Prazo</dt><dd>{detail.due ? `${formatDate(detail.due, { day: '2-digit', month: 'long', year: 'numeric' })} (${relativeDay(detail.due)})` : 'Sem prazo'}</dd></div>
            <div><dt>Projeto</dt><dd>{detail.projectId && projectsById[detail.projectId] ? <a href={`#/projetos/${detail.projectId}`} onClick={() => setDetailId(null)}>{projectsById[detail.projectId].name}</a> : '—'}</dd></div>
            <div><dt>Cliente</dt><dd>{detail.clientId && clientsById[detail.clientId] ? <a href={`#/clientes/${detail.clientId}`} onClick={() => setDetailId(null)}>{clientsById[detail.clientId].name}</a> : '—'}</dd></div>
            <div><dt>Categoria</dt><dd>{detail.category || '—'}</dd></div>
            <div><dt>Tags</dt><dd>{detail.tags.length ? detail.tags.join(', ') : '—'}</dd></div>
            <div className="detail__wide"><dt>Descrição</dt><dd className="detail__text">{detail.description || '—'}</dd></div>
          </dl>
        )}
      </Dialog>

      <Dialog
        open={!!toDelete}
        title="Excluir tarefa?"
        onClose={() => setToDelete(null)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="primary" onClick={confirmDelete} loading={deleting}>Excluir</Button>
          </>
        }
      >
        <p>“{toDelete?.title}” será excluída e não poderá ser recuperada.</p>
      </Dialog>
    </div>
  )
}
