// Commit 09 — autenticação e perfil. A interface usa este módulo, nunca o SDK direto.
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'

export const DEFAULT_PREFERENCES = { locale: 'pt-BR', currency: 'BRL', theme: 'system' }

export function subscribeToAuth(callback, onError) {
  return onAuthStateChanged(auth, callback, onError)
}

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const signOutUser = () => signOut(auth)
export const requestPasswordReset = (email) => sendPasswordResetEmail(auth, email)

// Perfil mínimo em users/{uid}. Criado no primeiro login; não guarda papel/permissão.
export async function loadOrCreateProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  const profile = {
    email: user.email,
    displayName: user.displayName ?? '',
    preferences: DEFAULT_PREFERENCES,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(ref, profile)
  return { id: user.uid, ...profile, createdAt: null, updatedAt: null }
}

// Mensagens em português para os erros de login mais comuns.
export function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.'
    case 'auth/invalid-email':
      return 'Digite um e-mail válido.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor. Verifique sua internet.'
    case 'auth/user-disabled':
      return 'Esta conta está desativada.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
