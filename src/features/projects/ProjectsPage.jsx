import { useMemo, useState } from 'react'
import { LayoutList, Columns3, Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import ProgressBar from '../../components/ProgressBar.jsx'
import { Input, Select } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { PriorityBadge } from '../tasks/TasksPage.jsx'
import { useProjects } from './ProjectsProvider.jsx'
import { useProjectEditor } from './ProjectEditor.jsx'
import { useTemplateWizard } from '../templates/TemplateWizard.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { projectErrorMessage, setProjectStatus } from '../../services/projects.js'
import {
  EMPTY_PROGRESS, PROJECT_STATUS_LABEL, PROJECT_STATUS_OPTIONS, PROJECT_TYPE_LABEL, PROJECT_TYPE_OPTIONS, PROJECT_VIEWS,
  filterProjects, kanbanColumns, progressByProject, projectIsLate, sortProjects,
} from '../../utils/projects.js'
import { formatDate, relativeDay } from '../../utils/format.js'
import useIncremental from '../../components/useIncremental.js'
import ShowMore from '../../components/ShowMore.jsx'

export function ClientTag({ client }) {
  if (!client) return null
  return <>{client.name}{client.status === 'archived' ? ' (arquivado)' : ''}</>
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const { status, projects, error, retry } = useProjects()
  const { byId: clientsById } = useClients()
  const { tasks } = useTasks()
  const editor = useProjectEditor()
  const wizard = useTemplateWizard()
  const [layout, setLayout] = useState('list')
  const [filters, setFilters] = useState({ view: 'open', search: '', type: '' })
  const [actionError, setActionError] = useState('')

  const visible = useMemo(() => sortProjects(filterProjects(projects, filters)), [projects, filters])
  const inc = useIncremental(visible, JSON.stringify(filters))
  const progress = useMemo(() => progressByProject(tasks), [tasks])

  async function move(project, next) {
    setActionError('')
    try { await setProjectStatus(user.uid, project.id, next) } catch (err) { setActionError(projectErrorMessage(err)) }
  }

  const Card = ({ p }) => (
    <li className="pcard">
      <a href={`#/projetos/${p.id}`} className="pcard__title">{p.name}</a>
      <p className="row__meta">
        {PROJECT_TYPE_LABEL[p.type]}{p.clientId && clientsById[p.clientId] ? <> · <ClientTag client={clientsById[p.clientId]} /></> : ''}
      </p>
      <p className={`row__meta ${projectIsLate(p) ? 'is-late' : ''}`}>
        {p.dueDate ? `prazo ${formatDate(p.dueDate)} (${relativeDay(p.dueDate)})` : 'sem prazo'}
      </p>
      <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
      <div className="pcard__foot">
        <PriorityBadge priority={p.priority} />
        <Select label={`Mover ${p.name} para`} value={p.status} onChange={(e) => move(p, e.target.value)} options={PROJECT_STATUS_OPTIONS} />
      </div>
    </li>
  )

  return (
    <div className="center__inner center__inner--wide">
      <header className="dash-head">
        <h1 className="page-title">Projetos</h1>
        <div className="actions">
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Novo projeto</Button>
          <Button onClick={() => wizard.open()}>A partir de modelo</Button>
        </div>
      </header>

      <div className="filters">
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Visão">
            {PROJECT_VIEWS.map((v) => (
              <button key={v.id} type="button" className="chip" aria-pressed={filters.view === v.id} onClick={() => setFilters((f) => ({ ...f, view: v.id }))}>{v.label}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Formato">
            <button type="button" className="chip" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><LayoutList size={14} aria-hidden="true" /> Lista</button>
            <button type="button" className="chip" aria-pressed={layout === 'kanban'} onClick={() => setLayout('kanban')}><Columns3 size={14} aria-hidden="true" /> Kanban</button>
          </div>
        </div>
        <div className="filters__row filters__row--2">
          <Input label="Buscar" type="search" placeholder="Nome ou descrição" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <Select label="Tipo" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} options={[{ value: '', label: 'Todos' }, ...PROJECT_TYPE_OPTIONS]} />
        </div>
      </div>

      {actionError && <ErrorState title="Não foi possível mover o projeto">{actionError}</ErrorState>}
      {status === 'loading' && <LoadingState label="Carregando projetos…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar os projetos" onRetry={retry}>{projectErrorMessage(error)}</ErrorState>}
      {status === 'ready' && visible.length === 0 && (
        projects.length === 0
          ? <EmptyState title="Nenhum projeto ainda" action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Criar o primeiro projeto</Button>}>Projetos reúnem tarefas, prazos, links e diário.</EmptyState>
          : <EmptyState title="Nenhum projeto encontrado">Ajuste a visão, a busca ou o tipo.</EmptyState>
      )}

      {status === 'ready' && visible.length > 0 && layout === 'list' && (
        <>
        <ul className="plist">{inc.shown.map((p) => (
          <li key={p.id} className="plist__row">
            <div className="plist__main">
              <a href={`#/projetos/${p.id}`} className="pcard__title">{p.name}</a>
              <p className="row__meta">
                {PROJECT_TYPE_LABEL[p.type]}{p.clientId && clientsById[p.clientId] ? <> · <ClientTag client={clientsById[p.clientId]} /></> : ''}
                {' · '}<span className={projectIsLate(p) ? 'is-late' : ''}>{p.dueDate ? `prazo ${formatDate(p.dueDate)} (${relativeDay(p.dueDate)})` : 'sem prazo'}</span>
              </p>
              <ProgressBar progress={progress[p.id] ?? EMPTY_PROGRESS} label={`Progresso de ${p.name}`} />
            </div>
            <span className="task__badges"><PriorityBadge priority={p.priority} /><StatusBadge status={p.status} /></span>
          </li>
        ))}</ul>
        <ShowMore inc={inc} noun="projetos" />
        </>
      )}

      {status === 'ready' && visible.length > 0 && layout === 'kanban' && (
        <div className="kanban">
          {kanbanColumns(filters.view).map((col) => {
            const items = visible.filter((p) => p.status === col)
            return (
              <section key={col} className="kanban__col" aria-label={PROJECT_STATUS_LABEL[col]}>
                <h2 className="kanban__head">{PROJECT_STATUS_LABEL[col]} <span className="row__meta">{items.length}</span></h2>
                {items.length === 0 ? <p className="row__meta">Nenhum projeto</p> : <ul className="kanban__list">{items.map((p) => <Card key={p.id} p={p} />)}</ul>}
              </section>
            )
          })}
        </div>
      )}
      {status === 'ready' && visible.length > 0 && <p className="card__hint">{`Progresso = tarefas concluídas ÷ tarefas não canceladas. Lista e Kanban mostram os mesmos projetos; mude o status pelo seletor de cada cartão.`}</p>}
    </div>
  )
}
