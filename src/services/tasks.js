// Commit 10 — acesso ao Firestore para tarefas: users/{uid}/tasks/{id}.
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const tasksCol = (uid) => collection(db, 'users', uid, 'tasks')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    title: x.title ?? '',
    description: x.description ?? '',
    status: x.status ?? 'todo',
    priority: x.priority ?? 'medium',
    due: toDate(x.due),
    category: x.category ?? '',
    tags: Array.isArray(x.tags) ? x.tags : [],
    clientId: x.clientId ?? null, // vínculos ainda sem interface (commits 11 e 12)
    projectId: x.projectId ?? null,
    completedAt: toDate(x.completedAt),
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

// Assinatura em tempo real: dashboard e módulo de tarefas leem a mesma fonte.
export function subscribeToTasks(uid, onData, onError) {
  return onSnapshot(tasksCol(uid), (snap) => onData(snap.docs.map(fromDoc)), onError)
}

function payload(v) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    status: v.status,
    priority: v.priority,
    due: v.due ? Timestamp.fromDate(v.due) : null,
    category: v.category.trim(),
    tags: v.tags,
    completedAt: v.status === 'done' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  }
}

export const createTask = (uid, values) =>
  addDoc(tasksCol(uid), { ...payload(values), clientId: null, projectId: null, createdAt: serverTimestamp() })

export const updateTask = (uid, id, values) => updateDoc(doc(db, 'users', uid, 'tasks', id), payload(values))

export const setTaskStatus = (uid, id, status) =>
  updateDoc(doc(db, 'users', uid, 'tasks', id), {
    status,
    completedAt: status === 'done' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })

export const deleteTask = (uid, id) => deleteDoc(doc(db, 'users', uid, 'tasks', id))

export function taskErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar as tarefas. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Esta tarefa não existe mais. Atualize a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
