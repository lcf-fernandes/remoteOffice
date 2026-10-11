// Commit 19 — modelos de projeto (users/{uid}/templates/{id}) e criação atômica de projeto + tarefas.
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

const col = (uid) => collection(db, 'users', uid, 'templates')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id, builtin: false, name: x.name ?? '', description: x.description ?? '', projectType: x.projectType ?? 'other',
    tasks: Array.isArray(x.tasks) ? x.tasks.filter((t) => t && typeof t.title === 'string') : [],
    createdAt: toDate(x.createdAt), updatedAt: toDate(x.updatedAt),
  }
}
export const subscribeToTemplates = (uid, onData, onError) => onSnapshot(col(uid), (snap) => onData(snap.docs.map(fromDoc)), onError)

const payload = (v) => ({ name: v.name.trim(), description: v.description.trim(), projectType: v.projectType, tasks: v.tasks, updatedAt: serverTimestamp() })
export const createTemplate = (uid, v) => addDoc(col(uid), { ...payload(v), createdAt: serverTimestamp() })
export const updateTemplate = (uid, id, v) => updateDoc(doc(db, 'users', uid, 'templates', id), payload(v))
export const deleteTemplate = (uid, id) => deleteDoc(doc(db, 'users', uid, 'templates', id))

// Cria o projeto e TODAS as tarefas confirmadas em uma única operação atômica (ou grava tudo, ou não grava nada).
// Só roda depois que o usuário confirmou o plano exibido na tela.
export async function createProjectFromPlan(uid, plan) {
  const projectRef = doc(collection(db, 'users', uid, 'projects'))
  const batch = writeBatch(db)
  const p = plan.project
  batch.set(projectRef, {
    name: p.name, description: p.description, clientId: p.clientId, type: p.type, status: p.status, priority: p.priority,
    startDate: p.startDate ? Timestamp.fromDate(p.startDate) : null, dueDate: p.dueDate ? Timestamp.fromDate(p.dueDate) : null,
    links: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  plan.tasks.forEach((t) => {
    batch.set(doc(collection(db, 'users', uid, 'tasks')), {
      title: t.title, description: t.description, status: 'todo', priority: t.priority,
      due: t.due ? Timestamp.fromDate(t.due) : null, category: t.category, tags: [],
      clientId: t.clientId, projectId: projectRef.id, completedAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
  return projectRef.id
}

export function templateErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar os modelos. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este modelo não existe mais. Atualize a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Nada foi criado; tente novamente quando a conexão voltar.'
    case 'invalid-argument':
      return 'Os dados do modelo são inválidos. Revise os campos.'
    default:
      return 'Não foi possível concluir a operação. Nada foi criado; tente novamente.'
  }
}
