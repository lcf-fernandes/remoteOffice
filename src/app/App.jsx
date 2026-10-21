import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Button from '../components/Button.jsx'
import LeftPanel from '../layout/LeftPanel.jsx'
import { NAV } from '../layout/nav.js'
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
import NotesProvider from '../features/notes/NotesProvider.jsx'
import NoteEditorProvider from '../features/notes/NoteEditor.jsx'
import WorkLogEditorProvider from '../features/notes/WorkLogEditor.jsx'
import NotesPage from '../features/notes/NotesPage.jsx'
import PreferencesProvider, { usePreferences } from '../features/preferences/PreferencesProvider.jsx'
import SettingsPage from '../features/preferences/SettingsPage.jsx'
import TemplatesProvider from '../features/templates/TemplatesProvider.jsx'
import TemplateEditorProvider from '../features/templates/TemplateEditor.jsx'
import TemplateWizardProvider from '../features/templates/TemplateWizard.jsx'
import TemplatesPage from '../features/templates/TemplatesPage.jsx'
import { ErrorState, LoadingState } from '../components/states.jsx'
import { accountErrorMessage } from '../services/auth.js'

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
  const toggleRef = useRef(null)
  const leftRef = useRef(null)
  const mainRef = useRef(null)
  const firstRoute = useRef(true)
  const drawerWasOpen = useRef(false)

  // Gaveta (celular): ao abrir, o foco vai para dentro dela; ao fechar, volta ao botão do menu.
  useEffect(() => {
    if (drawer) { drawerWasOpen.current = true; leftRef.current?.querySelector('button, a[href], select')?.focus() }
    else if (drawerWasOpen.current) { drawerWasOpen.current = false; toggleRef.current?.focus() }
  }, [drawer])

  // Cada tela tem o seu título na aba (e no histórico do navegador).
  useEffect(() => {
    const item = NAV.find((n) => n.id === route)
    document.title = `${item ? item.label : 'Página não encontrada'} · Leandro Desk`
  }, [route])

  // Ao trocar de tela, o foco vai para o conteúdo (quem usa teclado ou leitor de tela não fica preso no menu). Não age na 1ª carga.
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return }
    mainRef.current?.focus({ preventScroll: true })
  }, [route, param])

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
        <Button ref={toggleRef} variant="ghost" icon={drawer ? X : Menu} aria-label={drawer ? 'Fechar menu' : 'Abrir menu'} aria-expanded={drawer} onClick={() => setDrawer((v) => !v)} />
        <span className="topbar__name">Leandro Desk</span>
      </header>

      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside ref={leftRef} className={`col col--left ${drawer ? 'is-open' : ''}`} aria-label="Navegação e rotina">
        <LeftPanel route={route} onNavigate={() => setDrawer(false)} />
      </aside>

      <main ref={mainRef} id="conteudo" className="col col--center" tabIndex={-1}>
        {route === 'dashboard' ? <Dashboard /> : route === 'tarefas' ? <TasksPage openId={param || null} /> : route === 'clientes' ? (param ? <ClientDetail id={param} /> : <ClientsPage />) : route === 'projetos' ? (param ? <ProjectDetail id={param} /> : <ProjectsPage />) : route === 'agenda' ? <AgendaPage /> : route === 'comercial' ? (param ? <ProposalDetail id={param} /> : <ProposalsPage />) : route === 'financeiro' ? <FinancePage openId={param || null} /> : route === 'tempo' ? <TimePage /> : route === 'notas' ? <NotesPage /> : route === 'configuracoes' ? <SettingsPage /> : route === 'modelos' ? <TemplatesPage /> : <ModulePlaceholder route={route} />}
      </main>

      <aside className="col col--right" aria-label="Contexto e pendências">
        <RightPanel />
      </aside>
    </div>
  )
}

// O estilo de data é um ajuste global: ao mudar, as telas são remontadas para reformatar todas as datas.
function KeyedWorkspace() {
  const { prefs } = usePreferences()
  return <Workspace key={prefs.dateStyle} />
}

function Gate() {
  const auth = useAuth()
  useEffect(() => { if (auth.status === 'signedOut') document.title = 'Entrar · Leandro Desk' }, [auth.status])
  if (auth.status === 'unconfigured') return <main className="login"><div className="login__card"><FirebaseNotice /></div></main>
  if (auth.status === 'loading') return <main className="login"><LoadingState label="Verificando sessão…" /></main>
  if (auth.status === 'error') return <main className="login"><div className="login__card"><ErrorState title="Não foi possível carregar sua conta">{accountErrorMessage(auth.error)}</ErrorState></div></main>
  if (auth.status === 'signedOut') return <LoginPage />
  return (
    <PreferencesProvider>
    <TemplatesProvider uid={auth.user.uid}>
    <TasksProvider uid={auth.user.uid}>
      <ClientsProvider uid={auth.user.uid}>
        <ProjectsProvider uid={auth.user.uid}>
          <EventsProvider uid={auth.user.uid}>
            <ProposalsProvider uid={auth.user.uid}>
              <TransactionsProvider uid={auth.user.uid}>
                <TimeProvider uid={auth.user.uid}>
                  <NotesProvider uid={auth.user.uid}>
                    <TaskEditorProvider>
                      <ClientEditorProvider>
                        <ProjectEditorProvider>
                          <EventEditorProvider>
                            <ProposalEditorProvider>
                              <TransactionEditorProvider>
                                <EntryEditorProvider>
                                  <NoteEditorProvider>
                                    <WorkLogEditorProvider>
                                      <TemplateEditorProvider>
                                        <TemplateWizardProvider>
                                          <KeyedWorkspace />
                                        </TemplateWizardProvider>
                                      </TemplateEditorProvider>
                                    </WorkLogEditorProvider>
                                  </NoteEditorProvider>
                                </EntryEditorProvider>
                              </TransactionEditorProvider>
                            </ProposalEditorProvider>
                          </EventEditorProvider>
                        </ProjectEditorProvider>
                      </ClientEditorProvider>
                    </TaskEditorProvider>
                  </NotesProvider>
                </TimeProvider>
              </TransactionsProvider>
            </ProposalsProvider>
          </EventsProvider>
        </ProjectsProvider>
      </ClientsProvider>
    </TasksProvider>
    </TemplatesProvider>
    </PreferencesProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
