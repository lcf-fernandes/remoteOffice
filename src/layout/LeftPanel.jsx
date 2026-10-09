import { NAV } from './nav.js'
import QuickAdd from './QuickAdd.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatLongDate } from '../utils/format.js'
import Button from '../components/Button.jsx'
import { LogOut } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { signOutUser } from '../services/auth.js'
import { useTasks } from '../features/tasks/TasksProvider.jsx'
import { isDueToday, sortTasks } from '../utils/tasks.js'

export default function LeftPanel({ route, onNavigate }) {
  const auth = useAuth()
  const { status, tasks } = useTasks()
  const today = sortTasks(tasks.filter(isDueToday))
  return (
    <div className="left">
      <div className="left__brand">
        <span className="left__logo" aria-hidden="true">LD</span>
        <div>
          <p className="left__name">Leandro Desk</p>
          <p className="left__date">{formatLongDate()}</p>
        </div>
      </div>

      <QuickAdd />

      <nav aria-label="Principal" className="left__nav">
        <ul>
          {NAV.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <a href={`#/${id}`} className="left__link" aria-current={route === id ? 'page' : undefined} onClick={() => onNavigate?.(id)}>
                <Icon size={16} aria-hidden="true" /> {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="l-hoje" className="left__section">
        <h2 id="l-hoje" className="left__h">Hoje</h2>
        {status === 'loading' && <p className="left__muted">Carregando…</p>}
        {status === 'error' && <p className="left__muted">Não foi possível carregar as tarefas.</p>}
        {status === 'ready' && today.length === 0 && <p className="left__muted">Nenhuma tarefa com prazo hoje.</p>}
        <ul className="left__tasks">
          {today.map((t) => (
            <li key={t.id}><span>{t.title}</span><StatusBadge status={t.status} /></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="l-notas" className="left__section">
        <h2 id="l-notas" className="left__h">Notas rápidas</h2>
        <p className="left__muted">Disponível no commit 17.</p>
      </section>

      <section aria-labelledby="l-atalhos" className="left__section">
        <h2 id="l-atalhos" className="left__h">Atalhos externos</h2>
        <p className="left__muted">Nenhum atalho configurado. Você poderá adicionar GitHub, Firebase, e-mail e outras ferramentas em Configurações.</p>
      </section>

      {auth?.user && (
        <div className="left__user">
          <span>{auth.user.email}</span>
          <Button icon={LogOut} onClick={() => signOutUser()}>Sair</Button>
        </div>
      )}
    </div>
  )
}
