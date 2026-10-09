import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Button from '../components/Button.jsx'
import LeftPanel from '../layout/LeftPanel.jsx'
import RightPanel from '../layout/RightPanel.jsx'
import Dashboard from '../features/dashboard/Dashboard.jsx'
import ModulePlaceholder from '../features/modules/ModulePlaceholder.jsx'

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'dashboard'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()
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
        {route === 'dashboard' ? <Dashboard /> : <ModulePlaceholder route={route} />}
      </main>

      <aside className="col col--right" aria-label="Contexto e pendências">
        <RightPanel />
      </aside>
    </div>
  )
}
