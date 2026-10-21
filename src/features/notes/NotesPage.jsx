import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { Input, Select } from '../../components/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useNotes } from './NotesProvider.jsx'
import { useNoteEditor } from './NoteEditor.jsx'
import { useWorkLogEditor } from './WorkLogEditor.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useTaskEditor } from '../tasks/TaskEditor.jsx'
import { notesErrorMessage } from '../../services/notes.js'
import { allTags, filterNotes, filterWorkLog, noteHeading, snippet, sortNotes, sortWorkLog } from '../../utils/notes.js'
import { formatDate } from '../../utils/format.js'
import useIncremental from '../../components/useIncremental.js'
import ShowMore from '../../components/ShowMore.jsx'

// Chips de vínculo: levem ao registro correto (cliente/projeto → página; tarefa → abre a tarefa).
export function LinkChips({ item }) {
  const { byId: clients } = useClients()
  const { byId: projects } = useProjects()
  const { tasks } = useTasks()
  const taskEditor = useTaskEditor()
  const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : null
  if (!item.clientId && !item.projectId && !item.taskId) return null
  return (
    <p className="row__meta links-inline">
      {item.clientId && (clients[item.clientId] ? <a href={`#/clientes/${item.clientId}`}>Cliente: {clients[item.clientId].name}</a> : <span>Cliente: (excluído)</span>)}
      {item.projectId && (projects[item.projectId] ? <a href={`#/projetos/${item.projectId}`}>Projeto: {projects[item.projectId].name}</a> : <span>Projeto: (excluído)</span>)}
      {item.taskId && (task ? <button type="button" className="linklike" onClick={() => taskEditor.openEdit(task)}>Tarefa: {task.title}</button> : <span>Tarefa: (excluída)</span>)}
    </p>
  )
}

export default function NotesPage() {
  const { status, notes, workLog, error, retry } = useNotes()
  const noteEditor = useNoteEditor()
  const logEditor = useWorkLogEditor()
  const { projects } = useProjects()
  const [tab, setTab] = useState('notes')
  const [f, setF] = useState({ search: '', tag: '', from: '', to: '', projectId: '' })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const shownNotes = useMemo(() => sortNotes(filterNotes(notes, f)), [notes, f])
  const shownLog = useMemo(() => sortWorkLog(filterWorkLog(workLog, f)), [workLog, f])
  const incNotes = useIncremental(shownNotes, `notes|${JSON.stringify(f)}`)
  const incLog = useIncremental(shownLog, `log|${JSON.stringify(f)}`)
  const tags = useMemo(() => allTags(notes), [notes])
  const hasFilter = f.search || f.tag || f.from || f.to || f.projectId

  return (
    <div className="center__inner">
      <header className="dash-head">
        <h1 className="page-title">Notas</h1>
        {tab === 'notes'
          ? <Button variant="primary" icon={Plus} onClick={() => noteEditor.openNew()}>Nova nota</Button>
          : <Button variant="primary" icon={Plus} onClick={() => logEditor.openNew()}>Novo registro</Button>}
      </header>

      <div className="chips" role="group" aria-label="Seção">
        <button type="button" className="chip" aria-pressed={tab === 'notes'} onClick={() => setTab('notes')}>Notas</button>
        <button type="button" className="chip" aria-pressed={tab === 'log'} onClick={() => setTab('log')}>Registro de trabalho</button>
      </div>

      <div className="filters">
        <div className="filters__row filters__row--4">
          <Input label="Buscar" type="search" placeholder={tab === 'notes' ? 'Título, conteúdo ou tag' : 'Feito, bloqueios ou próximo passo'} value={f.search} onChange={set('search')} />
          <Input label="De" type="date" value={f.from} onChange={set('from')} />
          <Input label="Até" type="date" value={f.to} onChange={set('to')} />
          {tab === 'notes'
            ? <Select label="Tag" value={f.tag} onChange={set('tag')} options={[{ value: '', label: 'Todas' }, ...tags.map((t) => ({ value: t, label: t }))]} />
            : <Select label="Projeto" value={f.projectId} onChange={set('projectId')} options={[{ value: '', label: 'Todos' }, ...[...projects].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name }))]} />}
        </div>
        <p className="card__hint">O período usa a {tab === 'notes' ? 'data de criação da nota' : 'data do registro'}.</p>
      </div>

      {status === 'loading' && <LoadingState label="Carregando notas…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar as notas" onRetry={retry}>{notesErrorMessage(error)}</ErrorState>}

      {status === 'ready' && tab === 'notes' && (
        shownNotes.length === 0 ? (
          notes.length === 0
            ? <EmptyState title="Nenhuma nota ainda" action={<Button variant="primary" icon={Plus} onClick={() => noteEditor.openNew()}>Criar a primeira nota</Button>}>Capture ideias rápidas pela lateral ou aqui.</EmptyState>
            : <EmptyState title="Nenhuma nota encontrada">{hasFilter ? 'Ajuste a busca, a tag ou as datas.' : ''}</EmptyState>
        ) : (
          <>
          <ul className="plist">
            {incNotes.shown.map((n) => (
              <li key={n.id} className="plist__row">
                <div className="plist__main">
                  <button type="button" className="linklike" onClick={() => noteEditor.openEdit(n)}>{noteHeading(n)}</button>
                  <p className="row__meta">{snippet(n.title ? n.content : n.content.split('\n').slice(1).join(' '))}</p>
                  {n.tags.length > 0 && <p className="row__meta">{n.tags.map((t) => `#${t}`).join(' ')}</p>}
                  <LinkChips item={n} />
                </div>
                <span className="row__meta">{n.createdAt ? formatDate(n.createdAt, { day: '2-digit', month: 'short', year: 'numeric' }) : 'agora'}</span>
              </li>
            ))}
          </ul>
          <ShowMore inc={incNotes} noun="notas" />
          </>
        )
      )}

      {status === 'ready' && tab === 'log' && (
        shownLog.length === 0 ? (
          workLog.length === 0
            ? <EmptyState title="Nenhum registro de trabalho ainda" action={<Button variant="primary" icon={Plus} onClick={() => logEditor.openNew()}>Criar o primeiro registro</Button>}>Anote o que fez, o que travou e o próximo passo para retomar sem esforço depois de uma pausa.</EmptyState>
            : <EmptyState title="Nenhum registro encontrado">{hasFilter ? 'Ajuste a busca, o projeto ou as datas.' : ''}</EmptyState>
        ) : (
          <>
          <ul className="plist">
            {incLog.shown.map((e) => (
              <li key={e.id} className="plist__row">
                <div className="plist__main">
                  <button type="button" className="linklike" onClick={() => logEditor.openEdit(e)}>{formatDate(e.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</button>
                  <LogSections entry={e} />
                  <LinkChips item={e} />
                </div>
              </li>
            ))}
          </ul>
          <ShowMore inc={incLog} noun="registros" />
          </>
        )
      )}
    </div>
  )
}

export function LogSections({ entry }) {
  return (
    <dl className="log">
      {entry.done && <div><dt>Feito</dt><dd>{entry.done}</dd></div>}
      {entry.blockers && <div><dt>Bloqueios</dt><dd>{entry.blockers}</dd></div>}
      {entry.nextStep && <div><dt>Próximo passo</dt><dd>{entry.nextStep}</dd></div>}
    </dl>
  )
}
