import { FirebaseError } from './store.js'

// Autenticação simulada: usuários cadastrados em `users`; sessão em `current`.
const state = { users: new Map(), current: null, subs: new Set() }
const auth = { get currentUser() { return state.current } }

export const getAuth = () => auth
export function onAuthStateChanged(_auth, next) {
  state.subs.add(next)
  queueMicrotask(() => { if (state.subs.has(next)) next(state.current) })
  return () => state.subs.delete(next)
}
const emit = () => state.subs.forEach((cb) => cb(state.current))

export async function signInWithEmailAndPassword(_auth, email, password) {
  const u = [...state.users.values()].find((x) => x.email === email)
  if (!u) throw new FirebaseError('auth/invalid-credential')
  if (u.password !== password) throw new FirebaseError('auth/invalid-credential')
  state.current = { uid: u.uid, email: u.email, displayName: null }
  emit()
}
export async function signOut() { state.current = null; emit() }
export async function sendPasswordResetEmail(_auth, email) {
  if (![...state.users.values()].some((x) => x.email === email)) throw new FirebaseError('auth/user-not-found')
}

// Controles dos testes
export const fakeAuth = {
  reset() { state.users.clear(); state.current = null; state.subs.clear() },
  addUser(uid, email, password = 'senha-correta') { state.users.set(uid, { uid, email, password }) },
  signIn(uid) { const u = state.users.get(uid); state.current = { uid, email: u.email, displayName: null }; emit() },
  expireSession() { state.current = null; emit() }, // sessão expirada/encerrada em outro lugar
}
