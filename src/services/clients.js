// Commit 11 — clientes e interações no Firestore.
// users/{uid}/clients/{id}  e  users/{uid}/clients/{id}/interactions/{id}
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'

const clientsCol = (uid) => collection(db, 'users', uid, 'clients')
const clientDoc = (uid, id) => doc(db, 'users', uid, 'clients', id)
const interactionsCol = (uid, id) => collection(db, 'users', uid, 'clients', id, 'interactions')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function clientFromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    name: x.name ?? '',
    company: x.company ?? '',
    email: x.email ?? '',
    phone: x.phone ?? '',
    source: x.source ?? '',
    status: x.status ?? 'lead',
    notes: x.notes ?? '',
    nextAction: x.nextAction ?? '',
    nextActionDate: toDate(x.nextActionDate),
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

export const subscribeToClients = (uid, onData, onError) =>
  onSnapshot(clientsCol(uid), (snap) => onData(snap.docs.map(clientFromDoc)), onError)

function payload(v) {
  return {
    name: v.name.trim(),
    company: v.company.trim(),
    email: v.email.trim(),
    phone: v.phone.trim(),
    source: v.source.trim(),
    status: v.status,
    notes: v.notes.trim(),
    nextAction: v.nextAction.trim(),
    nextActionDate: v.nextActionDate ? Timestamp.fromDate(v.nextActionDate) : null,
    updatedAt: serverTimestamp(),
  }
}

export const createClient = (uid, values) => addDoc(clientsCol(uid), { ...payload(values), createdAt: serverTimestamp() })
export const updateClient = (uid, id, values) => updateDoc(clientDoc(uid, id), payload(values))
export const setClientStatus = (uid, id, status) => updateDoc(clientDoc(uid, id), { status, updatedAt: serverTimestamp() })

// Excluir é permanente: remove as interações e desvincula as tarefas (elas continuam existindo).
// Uso pessoal: volume pequeno, cabe em um único lote (limite do Firestore: 500 operações).
export async function deleteClient(uid, id) {
  const [interactions, tasks] = await Promise.all([
    getDocs(interactionsCol(uid, id)),
    getDocs(query(collection(db, 'users', uid, 'tasks'), where('clientId', '==', id))),
  ])
  if (interactions.size + tasks.size > 480) throw Object.assign(new Error('too-many'), { code: 'too-many' })
  const batch = writeBatch(db)
  tasks.forEach((t) => batch.update(t.ref, { clientId: null, updatedAt: serverTimestamp() }))
  interactions.forEach((i) => batch.delete(i.ref))
  batch.delete(clientDoc(uid, id))
  await batch.commit()
}

// Interações
function interactionFromDoc(snap) {
  const x = snap.data()
  return { id: snap.id, date: toDate(x.date), type: x.type ?? 'other', summary: x.summary ?? '', createdAt: toDate(x.createdAt) }
}
export const subscribeToInteractions = (uid, clientId, onData, onError) =>
  onSnapshot(interactionsCol(uid, clientId), (snap) => {
    const list = snap.docs.map(interactionFromDoc)
    list.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    onData(list)
  }, onError)
export const addInteraction = (uid, clientId, v) =>
  addDoc(interactionsCol(uid, clientId), { date: Timestamp.fromDate(v.date), type: v.type, summary: v.summary.trim(), createdAt: serverTimestamp() })
export const deleteInteraction = (uid, clientId, id) => deleteDoc(doc(db, 'users', uid, 'clients', clientId, 'interactions', id))

export function clientErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar os clientes. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este cliente não existe mais. Volte para a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    case 'too-many':
      return 'Este cliente tem registros demais para excluir de uma vez. Arquive-o em vez de excluir.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
