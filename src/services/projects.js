// Commit 12 — projetos, marcos e diário no Firestore.
// users/{uid}/projects/{id}  +  /milestones/{id}  +  /journal/{id}
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'

const projectsCol = (uid) => collection(db, 'users', uid, 'projects')
const projectDoc = (uid, id) => doc(db, 'users', uid, 'projects', id)
const sub = (uid, id, name) => collection(db, 'users', uid, 'projects', id, name)
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    name: x.name ?? '',
    description: x.description ?? '',
    clientId: x.clientId ?? null,
    type: x.type ?? 'other',
    status: x.status ?? 'planning',
    priority: x.priority ?? 'medium',
    startDate: toDate(x.startDate),
    dueDate: toDate(x.dueDate),
    links: Array.isArray(x.links) ? x.links : [],
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

export const subscribeToProjects = (uid, onData, onError) =>
  onSnapshot(projectsCol(uid), (snap) => onData(snap.docs.map(fromDoc)), onError)

const payload = (v) => ({
  name: v.name.trim(),
  description: v.description.trim(),
  clientId: v.clientId || null,
  type: v.type,
  status: v.status,
  priority: v.priority,
  startDate: v.startDate ? Timestamp.fromDate(v.startDate) : null,
  dueDate: v.dueDate ? Timestamp.fromDate(v.dueDate) : null,
  links: v.links,
  updatedAt: serverTimestamp(),
})

export const createProject = (uid, values) => addDoc(projectsCol(uid), { ...payload(values), createdAt: serverTimestamp() })
export const updateProject = (uid, id, values) => updateDoc(projectDoc(uid, id), payload(values))
export const setProjectStatus = (uid, id, status) => updateDoc(projectDoc(uid, id), { status, updatedAt: serverTimestamp() })

// Exclusão permanente: apaga marcos e diário e desvincula tarefas e eventos (que continuam existindo).
export async function deleteProject(uid, id) {
  const [ms, js, ts, evs, prs, txs, notes, logs] = await Promise.all([
    getDocs(sub(uid, id, 'milestones')),
    getDocs(sub(uid, id, 'journal')),
    getDocs(query(collection(db, 'users', uid, 'tasks'), where('projectId', '==', id))),
    getDocs(query(collection(db, 'users', uid, 'events'), where('projectId', '==', id))),
    getDocs(query(collection(db, 'users', uid, 'proposals'), where('projectId', '==', id))),
    getDocs(query(collection(db, 'users', uid, 'transactions'), where('projectId', '==', id))),
    getDocs(query(collection(db, 'users', uid, 'notes'), where('projectId', '==', id))),
    getDocs(query(collection(db, 'users', uid, 'workLog'), where('projectId', '==', id))),
  ])
  if (ms.size + js.size + ts.size + evs.size + prs.size + txs.size + notes.size + logs.size > 480) throw Object.assign(new Error('too-many'), { code: 'too-many' })
  const batch = writeBatch(db)
  ts.forEach((t) => batch.update(t.ref, { projectId: null, updatedAt: serverTimestamp() }))
  evs.forEach((e) => batch.update(e.ref, { projectId: null, updatedAt: serverTimestamp() }))
  prs.forEach((pr) => batch.update(pr.ref, { projectId: null, updatedAt: serverTimestamp() }))
  txs.forEach((t) => batch.update(t.ref, { projectId: null, updatedAt: serverTimestamp() }))
  notes.forEach((n) => batch.update(n.ref, { projectId: null, updatedAt: serverTimestamp() }))
  logs.forEach((l) => batch.update(l.ref, { projectId: null, updatedAt: serverTimestamp() }))
  ms.forEach((m) => batch.delete(m.ref))
  js.forEach((j) => batch.delete(j.ref))
  batch.delete(projectDoc(uid, id))
  await batch.commit()
}

// Marcos
const msFrom = (s) => { const x = s.data(); return { id: s.id, title: x.title ?? '', date: toDate(x.date), done: !!x.done } }
export const subscribeToMilestones = (uid, pid, onData, onError) =>
  onSnapshot(sub(uid, pid, 'milestones'), (snap) => {
    const list = snap.docs.map(msFrom)
    list.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity))
    onData(list)
  }, onError)
export const addMilestone = (uid, pid, v) =>
  addDoc(sub(uid, pid, 'milestones'), { title: v.title.trim(), date: v.date ? Timestamp.fromDate(v.date) : null, done: false, createdAt: serverTimestamp() })
export const setMilestoneDone = (uid, pid, id, done) => updateDoc(doc(db, 'users', uid, 'projects', pid, 'milestones', id), { done })
export const deleteMilestone = (uid, pid, id) => deleteDoc(doc(db, 'users', uid, 'projects', pid, 'milestones', id))

// Diário
const jFrom = (s) => { const x = s.data(); return { id: s.id, date: toDate(x.date), text: x.text ?? '' } }
export const subscribeToJournal = (uid, pid, onData, onError) =>
  onSnapshot(sub(uid, pid, 'journal'), (snap) => {
    const list = snap.docs.map(jFrom)
    list.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    onData(list)
  }, onError)
export const addJournalEntry = (uid, pid, v) =>
  addDoc(sub(uid, pid, 'journal'), { date: Timestamp.fromDate(v.date), text: v.text.trim(), createdAt: serverTimestamp() })
export const deleteJournalEntry = (uid, pid, id) => deleteDoc(doc(db, 'users', uid, 'projects', pid, 'journal', id))

export function projectErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar os projetos. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este projeto não existe mais. Volte para a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    case 'too-many':
      return 'Este projeto tem registros demais para excluir de uma vez. Arquive-o em vez de excluir.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
