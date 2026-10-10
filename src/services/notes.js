// Commit 17 — notas e registro de trabalho no Firestore.
//   users/{uid}/notes/{id}     users/{uid}/workLog/{id}
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const notesCol = (uid) => collection(db, 'users', uid, 'notes')
const logCol = (uid) => collection(db, 'users', uid, 'workLog')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function noteFrom(snap) {
  const x = snap.data()
  return {
    id: snap.id, title: x.title ?? '', content: x.content ?? '', tags: Array.isArray(x.tags) ? x.tags : [],
    clientId: x.clientId ?? null, projectId: x.projectId ?? null, taskId: x.taskId ?? null,
    createdAt: toDate(x.createdAt), updatedAt: toDate(x.updatedAt),
  }
}
export const subscribeToNotes = (uid, onData, onError) => onSnapshot(notesCol(uid), (s) => onData(s.docs.map(noteFrom)), onError)

const notePayload = (v) => ({
  title: (v.title ?? '').trim(), content: v.content.trim(), tags: v.tags ?? [],
  clientId: v.clientId || null, projectId: v.projectId || null, taskId: v.taskId || null, updatedAt: serverTimestamp(),
})
export const createNote = (uid, values) => addDoc(notesCol(uid), { ...notePayload(values), createdAt: serverTimestamp() })
export const updateNote = (uid, id, values) => updateDoc(doc(db, 'users', uid, 'notes', id), notePayload(values))
export const deleteNote = (uid, id) => deleteDoc(doc(db, 'users', uid, 'notes', id))

function logFrom(snap) {
  const x = snap.data()
  return {
    id: snap.id, date: toDate(x.date), done: x.done ?? '', blockers: x.blockers ?? '', nextStep: x.nextStep ?? '',
    clientId: x.clientId ?? null, projectId: x.projectId ?? null, taskId: x.taskId ?? null,
    createdAt: toDate(x.createdAt), updatedAt: toDate(x.updatedAt),
  }
}
export const subscribeToWorkLog = (uid, onData, onError) => onSnapshot(logCol(uid), (s) => onData(s.docs.map(logFrom).filter((e) => e.date)), onError)

const logPayload = (v) => ({
  date: Timestamp.fromDate(v.date), done: v.done.trim(), blockers: v.blockers.trim(), nextStep: v.nextStep.trim(),
  clientId: v.clientId || null, projectId: v.projectId || null, taskId: v.taskId || null, updatedAt: serverTimestamp(),
})
export const createWorkLog = (uid, values) => addDoc(logCol(uid), { ...logPayload(values), createdAt: serverTimestamp() })
export const updateWorkLog = (uid, id, values) => updateDoc(doc(db, 'users', uid, 'workLog', id), logPayload(values))
export const deleteWorkLog = (uid, id) => deleteDoc(doc(db, 'users', uid, 'workLog', id))

export function notesErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar as notas. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este registro não existe mais. Atualize a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Seu texto continua na tela: tente salvar de novo quando a conexão voltar.'
    default:
      return 'Não foi possível salvar. Seu texto continua na tela: tente novamente.'
  }
}
