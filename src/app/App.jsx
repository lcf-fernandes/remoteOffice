import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Button from '../components/Button.jsx'
import LeftPanel from '../layout/LeftPanel.jsx'
import RightPanel from '../layout/RightPanel.jsx'
import Dashboard from '../features/dashboard/Dashboard.jsx'
import ModulePlaceholder from '../features/modules/ModulePlaceholder.jsx'
import FirebaseNotice from '../components/FirebaseNotice.jsx'
import AuthProvider, { useAuth } from '../features/auth/AuthProvider.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import TasksProvider from '../features/tasks/TasksProvider.jsx'
import TaskEditorProvider from '../features/tasks/TaskEditor.jsx'
import TasksPage from '../features/tasks/TasksPage.jsx'
import ClientsProvider from '../features/clients/ClientsProvider.jsx'
import ClientEditorProvider from '../features/clients/ClientEditor.jsx'
import ClientsPage from '../features/clients/ClientsPage.jsx'
import ClientDetail from '../features/clients/ClientDetail.jsx'
import ProjectsProvider from '../features/projects/ProjectsProvider.jsx'
import ProjectEditorProvider from '../features/projects/ProjectEditor.jsx'
import ProjectsPage from '../features/projects/ProjectsPage.jsx'
import ProjectDetail from '../features/projects/ProjectDetail.jsx'
import EventsProvider from '../features/events/EventsProvider.jsx'
import EventEditorProvider from '../features/events/EventEditor.jsx'
import AgendaPage from '../features/agenda/AgendaPage.jsx'
import ProposalsProvider from '../features/proposals/ProposalsProvider.jsx'
import ProposalEditorProvider from '../features/proposals/ProposalEditor.jsx'
import ProposalsPage from '../features/proposals/ProposalsPage.jsx'
import ProposalDetail from '../features/proposals/ProposalDetail.jsx'
import TransactionsProvider from '../features/finance/TransactionsProvider.jsx'
import TransactionEditorProvider from '../features/finance/TransactionEditor.jsx'
import FinancePage from '../features/finance/FinancePage.jsx'
import TimeProvider from '../features/time/TimeProvider.jsx'
import EntryEditorProvider from '../features/time/EntryEditor.jsx'
import TimePage from '../features/time/TimePage.jsx'
import { ErrorState, LoadingState } from '../components/states.jsx'
import { authErrorMessage } from '../services/auth.js'

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'dashboard' // ex.: 'clientes/abc123'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function Workspace() {
  const [route, param] = useHashRoute().split('/')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    if (!drawer) return
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="shell">
      <a className="skip" href="#conteudo">Ir para o conteúdo</a>

      <header className="topbar">
        <Button variant="ghost" icon={drawer ? X : Menu} aria-label={drawer ? 'Fechar menu' : 'Abrir menu'} aria-expanded={drawer} onClick={() => setDrawer((v) => !v)} />
        <span className="topbar__name">Leandro Desk</span>
      </header>

      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className={`col col--left ${drawer ? 'is-open' : ''}`} aria-label="Navegação e rotina">
        <LeftPanel route={route} onNavigate={() => setDrawer(false)} />
      </aside>

      <main id="conteudo" className="col col--center" tabIndex={-1}>
        {route === 'dashboard' ? <Dashboard /> : route === 'tarefas' ? <TasksPage /> : route === 'clientes' ? (param ? <ClientDetail id={param} /> : <ClientsPage />) : route === 'projetos' ? (param ? <ProjectDetail id={param} /> : <ProjectsPage />) : route === 'agenda' ? <AgendaPage /> : route === 'comercial' ? (param ? <ProposalDetail id={param} /> : <ProposalsPage />) : route === 'financeiro' ? <FinancePage /> : route === 'tempo' ? <TimePage /> : <ModulePlaceholder route={route} />}
      </main>

      <aside className="col col--right" aria-label="Contexto e pendências">
        <RightPanel />
      </aside>
    </div>
  )
}

function Gate() {
  const auth = useAuth()
  if (auth.status === 'unconfigured') return <main className="login"><div className="login__card"><FirebaseNotice /></div></main>
  if (auth.status === 'loading') return <main className="login"><LoadingState label="Verificando sessão…" /></main>
  if (auth.status === 'error') return <main className="login"><div className="login__card"><ErrorState title="Não foi possível carregar sua conta">{authErrorMessage(auth.error)}</ErrorState></div></main>
  if (auth.status === 'signedOut') return <LoginPage />
  return (
    <TasksProvider uid={auth.user.uid}>
      <ClientsProvider uid={auth.user.uid}>
        <ProjectsProvider uid={auth.user.uid}>
          <EventsProvider uid={auth.user.uid}>
            <ProposalsProvider uid={auth.user.uid}>
              <TransactionsProvider uid={auth.user.uid}>
                <TimeProvider uid={auth.user.uid}>
                  <TaskEditorProvider>
                    <ClientEditorProvider>
                      <ProjectEditorProvider>
                        <EventEditorProvider>
                          <ProposalEditorProvider>
                            <TransactionEditorProvider>
                              <EntryEditorProvider>
                                <Workspace />
                              </EntryEditorProvider>
                            </TransactionEditorProvider>
                          </ProposalEditorProvider>
                        </EventEditorProvider>
                      </ProjectEditorProvider>
                    </ClientEditorProvider>
                  </TaskEditorProvider>
                </TimeProvider>
              </TransactionsProvider>
            </ProposalsProvider>
          </EventsProvider>
        </ProjectsProvider>
      </ClientsProvider>
    </TasksProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
