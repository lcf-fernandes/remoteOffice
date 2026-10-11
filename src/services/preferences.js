// Commit 18 — preferências no perfil do usuário: users/{uid}.preferences (leitura em tempo real).
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'

export const subscribeToPreferences = (uid, onData, onError) =>
  onSnapshot(doc(db, 'users', uid), (snap) => onData(snap.exists() ? snap.data().preferences ?? {} : {}), onError)

// Atualização parcial por caminho (preferences.<chave>): não sobrescreve as demais preferências.
export function updatePreferences(uid, patch) {
  const data = { updatedAt: serverTimestamp() }
  for (const [key, value] of Object.entries(patch)) data[`preferences.${key}`] = value
  return updateDoc(doc(db, 'users', uid), data)
}

export function preferencesErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para salvar as preferências. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'unavailable':
      return 'Sem conexão com o servidor. A preferência não foi salva.'
    default:
      return 'Não foi possível salvar a preferência. Tente novamente.'
  }
}
