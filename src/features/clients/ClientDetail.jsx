import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowLeft, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from './ClientsProvider.jsx'
import { useClientEditor } from './ClientEditor.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useTaskEditor } from '../tasks/TaskEditor.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useProjectEditor } from '../projects/ProjectEditor.jsx'
import { PROJECT_TYPE_LABEL, projectIsLate, sortProjects } from '../../utils/projects.js'
import { PriorityBadge } from '../tasks/TasksPage.jsx'
import {
  addInteraction, clientErrorMessage, deleteClient, deleteInteraction, setClientStatus, subscribeToInteractions,
} from '../../services/clients.js'
import { INTERACTION_LABEL, INTERACTION_TYPES, nextActionIsLate, validateInteraction } from '../../utils/clients.js'
import { dateToInput, inputToDate, sortTasks } from '../../utils/tasks.js'
import { formatDate, relativeDay } from '../../utils/format.js'

export default function ClientDetail({ id }) {
  const { user } = useAuth()
  const { status, byId, retry } = useClients()
  const { tasks } = useTasks()
  const clientEditor = useClientEditor()
  const taskEditor = useTaskEditor()
  const { projects } = useProjects()
  const projectEditor = useProjectEditor()
  const client = byId?.[id]
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const clientProjects = useMemo(() => sortProjects(projects.filter((p) => p.clientId === id)), [projects, id])
  const linkedTasks = useMemo(() => sortTasks(tasks.filter((t) => t.clientId === id)), [tasks, id])

  if (status === 'loading') return <div className="center__inner"><LoadingState label="Carregando cliente…" /></div>
  if (status === 'error') return <div className="center__inner"><ErrorState title="Não foi possível carregar o cliente" onRetry={retry} /></div>
  if (!client) {
    return (
      <div className="center__inner">
        <EmptyState title="Cliente não encontrado" action={<a href="#/clientes">Voltar para Clientes</a>}>Ele pode ter sido excluído.</EmptyState>
      </div>
    )
  }

  async function toggleArchive() {
    setActionError(''); setBusy(true)
    try { await setClientStatus(user.uid, id, client.status === 'archived' ? 'active' : 'archived') }
    catch (err) { setActionError(clientErrorMessage(err)) }
    setBusy(false)
  }
  async function remove() {
    setActionError(''); setBusy(true)
    try { await deleteClient(user.uid, id); window.location.hash = '#/clientes' }
    catch (err) { setActionError(clientErrorMessage(err)); setConfirmDelete(false); setBusy(false) }
  }

  return (
    <div className="center__inner">
      <a href="#/clientes" className="back"><ArrowLeft size={14} aria-hidden="true" /> Clientes</a>
      <header className="dash-head">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>{client.company || 'Sem empresa informada'}</p>
        </div>
        <StatusBadge status={client.status} />
      </header>
      <div className="actions">
        <Button variant="primary" icon={Pencil} onClick={() => clientEditor.openEdit(client)}>Editar</Button>
        <Button icon={client.status === 'archived' ? ArchiveRestore : Archive} onClick={toggleArchive} loading={busy}>{client.status === 'archived' ? 'Reativar' : 'Arquivar'}</Button>
        <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Excluir</Button>
      </div>
      {actionError && <ErrorState title="Não foi possível concluir a ação">{actionError}</ErrorState>}

      <Card title="Contato e acompanhamento" id="c-info">
        <dl className="detail">
          <div><dt>E-mail</dt><dd>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : '—'}</dd></div>
          <div><dt>Telefone</dt><dd>{client.phone || '—'}</dd></div>
          <div><dt>Origem</dt><dd>{client.source || '—'}</dd></div>
          <div>
            <dt>Próxima ação</dt>
            <dd className={nextActionIsLate(client) ? 'is-late' : ''}>
              {client.nextAction || client.nextActionDate ? `${client.nextAction || '—'}${client.nextActionDate ? ` (${formatDate(client.nextActionDate)}, ${relativeDay(client.nextActionDate)})` : ''}` : '—'}
            </dd>
          </div>
          <div className="detail__wide"><dt>Observações</dt><dd className="detail__text">{client.notes || '—'}</dd></div>
        </dl>
      </Card>

      <Interactions uid={user.uid} clientId={id} />

      <Card title="Tarefas vinculadas" id="c-tasks" action={<Button icon={Plus} onClick={() => taskEditor.openNew({ clientId: id })}>Nova tarefa</Button>}>
        {linkedTasks.length === 0 ? (
          <EmptyState title="Nenhuma tarefa vinculada">Vincule tarefas a este cliente ao criá-las ou editá-las.</EmptyState>
        ) : (
          <ul className="rows">
            {linkedTasks.map((t) => (
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

      <Card title="Projetos" id="c-proj" action={<Button icon={Plus} onClick={() => projectEditor.openNew({ clientId: id })}>Novo projeto</Button>}>
        {clientProjects.length === 0 ? (
          <EmptyState title="Nenhum projeto deste cliente">Crie um projeto já vinculado a ele.</EmptyState>
        ) : (
          <ul className="rows">
            {clientProjects.map((p) => (
              <li key={p.id} className="row">
                <div>
                  <a className="pcard__title" href={`#/projetos/${p.id}`}>{p.name}</a>
                  <p className="row__meta">{PROJECT_TYPE_LABEL[p.type]} · <span className={projectIsLate(p) ? 'is-late' : ''}>{p.dueDate ? `prazo ${formatDate(p.dueDate)} (${relativeDay(p.dueDate)})` : 'sem prazo'}</span></p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Propostas" id="c-prop"><EmptyState title="Disponível no commit 14">As propostas deste cliente aparecerão aqui.</EmptyState></Card>

      <Dialog
        open={confirmDelete}
        title="Excluir cliente?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</Button>
            <Button variant="primary" onClick={remove} loading={busy}>Excluir</Button>
          </>
        }
      >
        <p>“{client.name}” e o histórico de interações serão excluídos para sempre. As tarefas vinculadas continuam, mas perdem o vínculo. Para só tirar da lista, use Arquivar.</p>
      </Dialog>
    </div>
  )
}

function Interactions({ uid, clientId }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [attempt, setAttempt] = useState(0)
  const blank = () => ({ date: dateToInput(new Date()), type: 'message', summary: '' })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    return subscribeToInteractions(uid, clientId, (items) => setState({ status: 'ready', items, error: null }), (error) => setState({ status: 'error', items: [], error }))
  }, [uid, clientId, attempt])

  async function onSubmit(e) {
    e.preventDefault()
    setFormError('')
    const found = validateInteraction(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try { await addInteraction(uid, clientId, { ...form, date: inputToDate(form.date) }); setForm(blank()) }
    catch (err) { setFormError(clientErrorMessage(err)) }
    setSaving(false)
  }
  async function remove(id) {
    setFormError('')
    try { await deleteInteraction(uid, clientId, id) } catch (err) { setFormError(clientErrorMessage(err)) }
  }
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }))

  return (
    <Card title="Histórico de interações" id="c-hist">
      <form className="form interaction-form" onSubmit={onSubmit} noValidate>
        <div className="form__row">
          <Input label="Data" type="date" value={form.date} onChange={set('date')} error={errors.date} />
          <Select label="Tipo" value={form.type} onChange={set('type')} options={INTERACTION_TYPES} />
        </div>
        <Textarea label="O que aconteceu" rows={2} value={form.summary} onChange={set('summary')} error={errors.summary} />
        {formError && <p className="field__error" role="alert">{formError}</p>}
        <div><Button type="submit" variant="primary" icon={Plus} loading={saving}>Registrar</Button></div>
      </form>

      {state.status === 'loading' && <LoadingState label="Carregando histórico…" />}
      {state.status === 'error' && <ErrorState title="Não foi possível carregar o histórico" onRetry={() => setAttempt((n) => n + 1)}>{clientErrorMessage(state.error)}</ErrorState>}
      {state.status === 'ready' && state.items.length === 0 && <EmptyState title="Nenhuma interação registrada" />}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="rows timeline-rows">
          {state.items.map((i) => (
            <li key={i.id} className="row">
              <div>
                <p className="row__meta"><strong>{INTERACTION_LABEL[i.type] ?? i.type}</strong> · {i.date ? formatDate(i.date, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                <p className="detail__text">{i.summary}</p>
              </div>
              <Button variant="ghost" icon={Trash2} aria-label="Excluir interação" onClick={() => remove(i.id)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
