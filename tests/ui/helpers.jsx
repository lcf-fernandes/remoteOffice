import { render } from '@testing-library/react'
import App from '../../src/app/App.jsx'
import { fakeAuth } from './fake-firebase/auth.js'
import { Timestamp, failAll, listDocs, readDoc, resetStore } from './fake-firebase/store.js'
import { seedProfile } from '../fixtures/workspace.js'

export { UID } from '../fixtures/workspace.js'
import { UID } from '../fixtures/workspace.js'
export { day } from '../fixtures/workspace.js'
export const ts = (d) => Timestamp.fromDate(d)
export const path = (...p) => ['users', UID, ...p].join('/')

// Sobe o app com usuário logado, dados semeados e o endereço (hash) desejado.
export function bootApp({ hash = '#/dashboard', seed, uid = UID, email = 'leandro@teste.com', signedIn = true, fail = null } = {}) {
  resetStore(); fakeAuth.reset()
  fakeAuth.addUser(uid, email)
  if (signedIn) fakeAuth.signIn(uid)
  seedProfile(uid, email)
  seed?.(uid)
  if (fail) failAll(...fail) // falha ativa já na montagem (ex.: ['unavailable', ['read']])
  window.location.hash = hash
  return render(<App />)
}

// Monta o app de novo SEM zerar nada (simula recarregar a página: sessão e dados continuam).
export function mountApp(hash = '#/dashboard') {
  window.location.hash = hash
  return render(<App />)
}

export { seedProfile, seedWorkspace } from '../fixtures/workspace.js'
export { listDocs, readDoc }
