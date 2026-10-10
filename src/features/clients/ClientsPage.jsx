import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { Input } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useClients } from './ClientsProvider.jsx'
import { useClientEditor } from './ClientEditor.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { clientErrorMessage } from '../../services/clients.js'
import { CLIENT_VIEWS, filterClients, nextActionIsLate, sortClients } from '../../utils/clients.js'
import { isOpen } from '../../utils/tasks.js'
import { formatDate } from '../../utils/format.js'

export default function ClientsPage() {
  const { status, clients, error, retry } = useClients()
  const { tasks } = useTasks()
  const editor = useClientEditor()
  const [filters, setFilters] = useState({ view: 'current', search: '' })
  const visible = useMemo(() => sortClients(filterClients(clients, filters)), [clients, filters])
  const openTasks = useMemo(() => {
    const m = {}
    tasks.filter(isOpen).forEach((t) => { if (t.clientId) m[t.clientId] = (m[t.clientId] ?? 0) + 1 })
    return m
  }, [tasks])

  return (
    <div className="center__inner">
      <header className="dash-head">
        <h1 className="page-title">Clientes</h1>
        <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Novo cliente</Button>
      </header>

      <div className="filters">
        <div className="chips" role="group" aria-label="Visão">
          {CLIENT_VIEWS.map((v) => (
            <button key={v.id} type="button" className="chip" aria-pressed={filters.view === v.id} onClick={() => setFilters((f) => ({ ...f, view: v.id }))}>{v.label}</button>
          ))}
        </div>
        <Input label="Buscar" type="search" placeholder="Nome, empresa, e-mail, telefone, origem…" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
      </div>

      {status === 'loading' && <LoadingState label="Carregando clientes…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar os clientes" onRetry={retry}>{clientErrorMessage(error)}</ErrorState>}
      {status === 'ready' && visible.length === 0 && (
        clients.length === 0
          ? <EmptyState title="Nenhum cliente ainda" action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Cadastrar o primeiro cliente</Button>}>Guarde contatos, histórico e próximas ações em um só lugar.</EmptyState>
          : <EmptyState title="Nenhum cliente encontrado">Ajuste a visão ou a busca.</EmptyState>
      )}
      {status === 'ready' && visible.length > 0 && (
        <ul className="task-list">
          {visible.map((c) => (
            <li key={c.id} className="task">
              <a className="task__main client__link" href={`#/clientes/${c.id}`}>
                <span className="row__title">{c.name}{c.company ? <span className="row__meta"> · {c.company}</span> : null}</span>
                <span className="row__meta">
                  {[c.email, c.phone].filter(Boolean).join(' · ') || 'sem contato'}
                  {openTasks[c.id] ? ` · ${openTasks[c.id]} ${openTasks[c.id] === 1 ? 'tarefa aberta' : 'tarefas abertas'}` : ''}
                </span>
                {(c.nextAction || c.nextActionDate) && (
                  <span className={`row__meta ${nextActionIsLate(c) ? 'is-late' : ''}`}>
                    Próxima ação: {c.nextAction || '—'}{c.nextActionDate ? ` (${formatDate(c.nextActionDate)})` : ''}
                  </span>
                )}
              </a>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
