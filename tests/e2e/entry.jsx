// Versão de TESTE do app para o navegador: Firebase simulado + dados semeados. Parâmetros: ?theme=dark&ctx=editing&week=mon&empty=1
import { createRoot } from 'react-dom/client'
import '../../src/styles/tokens.css'
import '../../src/styles/base.css'
import '../../src/styles/components.css'
import '../../src/styles/layout.css'
import App from '../../src/app/App.jsx'
import { fakeAuth } from '../ui/fake-firebase/auth.js'
import { resetStore } from '../ui/fake-firebase/store.js'
import { seedBig, seedLongText, seedProfile, seedWorkspace } from '../fixtures/workspace.js'

const q = new URLSearchParams(window.location.search)
resetStore(); fakeAuth.reset()
fakeAuth.addUser('u1', 'leandro@teste.com'); fakeAuth.signIn('u1')
seedProfile('u1', 'leandro@teste.com', { theme: q.get('theme') ?? 'light', context: q.get('ctx') ?? 'today', weekStart: q.get('week') ?? 'sun' })
if (!q.get('empty')) seedWorkspace('u1')
if (q.get('long')) seedLongText('u1')
if (q.get('big')) seedBig('u1', Number(q.get('big')) || 1200)
window.__seeded = performance.now() // para medir o tempo de carregamento
createRoot(document.getElementById('root')).render(<App />)
