// Commit 13 — eventos no Firestore: users/{uid}/events/{id}. Datas como Timestamp (instante absoluto).
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const eventsCol = (uid) => collection(db, 'users', uid, 'events')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    title: x.title ?? '',
    type: x.type ?? 'appointment',
    allDay: !!x.allDay,
    start: toDate(x.start),
    end: toDate(x.end),
    description: x.description ?? '',
    projectId: x.projectId ?? null,
    reminderMinutes: typeof x.reminderMinutes === 'number' ? x.reminderMinutes : null, // só armazenado; sem envio
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

export const subscribeToEvents = (uid, onData, onError) =>
  onSnapshot(eventsCol(uid), (snap) => onData(snap.docs.map(fromDoc).filter((e) => e.start)), onError)

const payload = (v) => ({
  title: v.title.trim(),
  type: v.type,
  allDay: v.allDay,
  start: Timestamp.fromDate(v.start),
  end: !v.allDay && v.end ? Timestamp.fromDate(v.end) : null,
  description: v.description.trim(),
  projectId: v.projectId || null,
  reminderMinutes: v.reminder === '' ? null : Number(v.reminder),
  updatedAt: serverTimestamp(),
})

export const createEvent = (uid, values) => addDoc(eventsCol(uid), { ...payload(values), createdAt: serverTimestamp() })
export const updateEvent = (uid, id, values) => updateDoc(doc(db, 'users', uid, 'events', id), payload(values))
export const deleteEvent = (uid, id) => deleteDoc(doc(db, 'users', uid, 'events', id))

export function eventErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar a agenda. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este evento não existe mais. Atualize a agenda.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
