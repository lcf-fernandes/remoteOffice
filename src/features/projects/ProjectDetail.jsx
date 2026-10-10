import { useEffect, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Dialog from '../../components/Dialog.jsx'
import ProgressBar from '../../components/ProgressBar.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { PriorityBadge } from '../tasks/TasksPage.jsx'
import { ClientTag } from './ProjectsPage.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from './ProjectsProvider.jsx'
import { useProjectEditor } from './ProjectEditor.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useTaskEditor } from '../tasks/TaskEditor.jsx'
import { useTime } from '../time/TimeProvider.jsx'
import { entryProjectId, totals as timeTotals } from '../../utils/time.js'
import { formatDuration } from '../../utils/time.js'
import {
  addJournalEntry, addMilestone, deleteJournalEntry, deleteMilestone, deleteProject, projectErrorMessage, setMilestoneDone,
  setProjectStatus, subscribeToJournal, subscribeToMilestones,
} from '../../services/projects.js'
import {
  EMPTY_PROGRESS, PROGRESS_RULE, PROJECT_STATUS_OPTIONS, PROJECT_TYPE_LABEL, linkLabel, projectIsLate, projectProgress, validateJournal, validateMilestone,
} from '../../utils/projects.js'
import { dateToInput, inputToDate, sortTasks } from '../../utils/tasks.js'
import { formatDate, relativeDay } from '../../utils/format.js'

export default function ProjectDetail({ id }) {
  const { user } = useAuth()
  const { status, byId, retry } = useProjects()
  const { byId: clientsById } = useClients()
  const { tasks } = useTasks()
  const projectEditor = useProjectEditor()
  const taskEditor = useTaskEditor()
  const time = useTime()
  const project = byId?.[id]
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const linked = useMemo(() => sortTasks(tasks.filter((t) => t.projectId === id)), [tasks, id])
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])
  const timeSum = useMemo(() => timeTotals(time.entries.filter((e) => entryProjectId(e, tasksById) === id)), [time.entries, tasksById, id])
  const progress = useMemo(() => (linked.length ? projectProgress(linked) : EMPTY_PROGRESS), [linked])

  if (status === 'loading') return <div className="center__inner"><LoadingState label="Carregando projeto…" /></div>
  if (status === 'error') return <div className="center__inner"><ErrorState title="Não foi possível carregar o projeto" onRetry={retry} /></div>
  if (!project) {
    return <div className="center__inner"><EmptyState title="Projeto não encontrado" action={<a href="#/projetos">Voltar para Projetos</a>}>Ele pode ter sido excluído.</EmptyState></div>
  }
  const client = project.clientId ? clientsById[project.clientId] : null

  async function changeStatus(next) {
    setActionError('')
    try { await setProjectStatus(user.uid, id, next) } catch (err) { setActionError(projectErrorMessage(err)) }
  }
  async function remove() {
    setActionError(''); setBusy(true)
    try { await deleteProject(user.uid, id); window.location.hash = '#/projetos' }
    catch (err) { setActionError(projectErrorMessage(err)); setConfirmDelete(false); setBusy(false) }
  }

  return (
    <div className="center__inner">
      <a href="#/projetos" className="back"><ArrowLeft size={14} aria-hidden="true" /> Projetos</a>
      <header className="dash-head">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>
            {PROJECT_TYPE_LABEL[project.type]} · {client ? <a href={`#/clientes/${client.id}`}><ClientTag client={client} /></a> : 'sem cliente'}
          </p>
        </div>
        <span className="task__badges"><PriorityBadge priority={project.priority} /><StatusBadge status={project.status} /></span>
      </header>

      <div className="actions">
        <Button variant="primary" icon={Pencil} onClick={() => projectEditor.openEdit(project)}>Editar</Button>
        <Button icon={project.status === 'archived' ? ArchiveRestore : Archive} onClick={() => changeStatus(project.status === 'archived' ? 'active' : 'archived')}>{project.status === 'archived' ? 'Reativar' : 'Arquivar'}</Button>
        <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Excluir</Button>
        <div className="actions__select"><Select label="Status" value={project.status} onChange={(e) => changeStatus(e.target.value)} options={PROJECT_STATUS_OPTIONS} /></div>
      </div>
      {actionError && <ErrorState title="Não foi possível concluir a ação">{actionError}</ErrorState>}

      <Card title="Resumo" id="p-info">
        <dl className="detail">
          <div><dt>Início</dt><dd>{project.startDate ? formatDate(project.startDate, { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</dd></div>
          <div><dt>Prazo final</dt><dd className={projectIsLate(project) ? 'is-late' : ''}>{project.dueDate ? `${formatDate(project.dueDate, { day: '2-digit', month: 'long', year: 'numeric' })} (${relativeDay(project.dueDate)})` : '—'}</dd></div>
          <div className="detail__wide"><dt>Links de referência</dt>
            <dd>{project.links.length ? <ul className="links">{project.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer">{linkLabel(l)} <ExternalLink size={12} aria-hidden="true" /></a></li>)}</ul> : '—'}</dd>
          </div>
          <div className="detail__wide"><dt>Descrição</dt><dd className="detail__text">{project.description || '—'}</dd></div>
        </dl>
      </Card>

      <Card title="Progresso" id="p-prog" hint={PROGRESS_RULE}>
        <ProgressBar progress={progress} label={`Progresso de ${project.name}`} />
      </Card>

      <Card title="Tempo registrado" id="p-time" hint="Não é tempo faturável: nenhuma cobrança é gerada" action={<a href="#/tempo">Abrir Tempo</a>}>
        <p><strong>{formatDuration(timeSum.seconds)}</strong> em {timeSum.count} {timeSum.count === 1 ? 'registro' : 'registros'}{timeSum.billableSeconds ? ` · ${formatDuration(timeSum.billableSeconds)} marcados como faturáveis` : ''}</p>
      </Card>

      <Card title="Tarefas do projeto" id="p-tasks" action={<Button icon={Plus} onClick={() => taskEditor.openNew({ projectId: id, clientId: project.clientId ?? '' })}>Nova tarefa</Button>}>
        {linked.length === 0 ? (
          <EmptyState title="Nenhuma tarefa neste projeto">Crie uma tarefa aqui ou escolha este projeto ao editar uma tarefa existente.</EmptyState>
        ) : (
          <ul className="rows">
            {linked.map((t) => (
              <li key={t.id} className="row">
                <div>
                  <button type="button" className="linklike" onClick={() => taskEditor.openEdit(t)}>{t.title}</button>
                  <p className="row__meta">{t.due ? `prazo ${formatDate(t.due)} (${relativeDay(t.due)})` : 'sem prazo'}</p>
                </div>
                <span className="task__badges"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Milestones uid={user.uid} projectId={id} />
      <Journal uid={user.uid} projectId={id} />

      <Dialog
        open={confirmDelete}
        title="Excluir projeto?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</Button>
            <Button variant="primary" onClick={remove} loading={busy}>Excluir</Button>
          </>
        }
      >
        <p>“{project.name}”, os marcos e o diário serão excluídos para sempre. As tarefas continuam, mas perdem o vínculo. Para só tirar da lista, use Arquivar.</p>
      </Dialog>
    </div>
  )
}

// Assinatura simples de subcoleção com estados de carregamento/erro.
function useSubcollection(subscribe, uid, projectId) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    return subscribe(uid, projectId, (items) => setState({ status: 'ready', items, error: null }), (error) => setState({ status: 'error', items: [], error }))
  }, [subscribe, uid, projectId, attempt])
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

function Milestones({ uid, projectId }) {
  const { status, items, error, retry } = useSubcollection(subscribeToMilestones, uid, projectId)
  const [form, setForm] = useState({ title: '', date: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function onSubmit(e) {
    e.preventDefault(); setFormError('')
    const found = validateMilestone(form); setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try { await addMilestone(uid, projectId, { title: form.title, date: inputToDate(form.date) }); setForm({ title: '', date: '' }) }
    catch (err) { setFormError(projectErrorMessage(err)) }
    setSaving(false)
  }
  const run = async (fn) => { setFormError(''); try { await fn() } catch (err) { setFormError(projectErrorMessage(err)) } }

  return (
    <Card title="Marcos" id="p-ms">
      <form className="form interaction-form" onSubmit={onSubmit} noValidate>
        <div className="form__row">
          <Input label="Marco" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} />
          <Input label="Data (opcional)" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} error={errors.date} />
        </div>
        {formError && <p className="field__error" role="alert">{formError}</p>}
        <div><Button type="submit" variant="primary" icon={Plus} loading={saving}>Adicionar marco</Button></div>
      </form>
      {status === 'loading' && <LoadingState label="Carregando marcos…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar os marcos" onRetry={retry}>{projectErrorMessage(error)}</ErrorState>}
      {status === 'ready' && items.length === 0 && <EmptyState title="Nenhum marco definido" />}
      {status === 'ready' && items.length > 0 && (
        <ul className="rows">
          {items.map((m) => (
            <li key={m.id} className="row">
              <label className="check">
                <input type="checkbox" checked={m.done} onChange={(e) => run(() => setMilestoneDone(uid, projectId, m.id, e.target.checked))} />
                <span>
                  <span className={m.done ? 'is-struck' : 'row__title'}>{m.title}</span>
                  <span className="row__meta"> {m.date ? `· ${formatDate(m.date)} (${relativeDay(m.date)})` : '· sem data'}</span>
                </span>
              </label>
              <Button variant="ghost" icon={Trash2} aria-label={`Excluir marco ${m.title}`} onClick={() => run(() => deleteMilestone(uid, projectId, m.id))} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Journal({ uid, projectId }) {
  const { status, items, error, retry } = useSubcollection(subscribeToJournal, uid, projectId)
  const blank = () => ({ date: dateToInput(new Date()), text: '' })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function onSubmit(e) {
    e.preventDefault(); setFormError('')
    const found = validateJournal(form); setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try { await addJournalEntry(uid, projectId, { date: inputToDate(form.date), text: form.text }); setForm(blank()) }
    catch (err) { setFormError(projectErrorMessage(err)) }
    setSaving(false)
  }

  return (
    <Card title="Diário do projeto" id="p-journal">
      <form className="form interaction-form" onSubmit={onSubmit} noValidate>
        <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} error={errors.date} />
        <Textarea label="Registro" rows={3} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} error={errors.text} />
        {formError && <p className="field__error" role="alert">{formError}</p>}
        <div><Button type="submit" variant="primary" icon={Plus} loading={saving}>Registrar</Button></div>
      </form>
      {status === 'loading' && <LoadingState label="Carregando diário…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar o diário" onRetry={retry}>{projectErrorMessage(error)}</ErrorState>}
      {status === 'ready' && items.length === 0 && <EmptyState title="Nenhum registro no diário" />}
      {status === 'ready' && items.length > 0 && (
        <ul className="rows">
          {items.map((j) => (
            <li key={j.id} className="row">
              <div>
                <p className="row__meta"><strong>{j.date ? formatDate(j.date, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong></p>
                <p className="detail__text">{j.text}</p>
              </div>
              <Button variant="ghost" icon={Trash2} aria-label="Excluir registro" onClick={async () => { try { await deleteJournalEntry(uid, projectId, j.id) } catch (err) { setFormError(projectErrorMessage(err)) } }} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
