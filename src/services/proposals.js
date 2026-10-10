// Commit 14 — propostas e histórico de status no Firestore.
// users/{uid}/proposals/{id}  e  users/{uid}/proposals/{id}/history/{id}
import { collection, doc, getDocs, onSnapshot, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { roundMoney } from '../utils/proposals.js'

const col = (uid) => collection(db, 'users', uid, 'proposals')
const ref = (uid, id) => doc(db, 'users', uid, 'proposals', id)
const histCol = (uid, id) => collection(db, 'users', uid, 'proposals', id, 'history')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    title: x.title ?? '',
    summary: x.summary ?? '',
    clientId: x.clientId ?? null,
    amount: typeof x.amount === 'number' ? x.amount : 0, // valor numérico na moeda `currency`
    currency: x.currency ?? 'BRL',
    sentDate: toDate(x.sentDate),
    validUntil: toDate(x.validUntil),
    status: x.status ?? 'draft',
    nextAction: x.nextAction ?? '',
    nextActionDate: toDate(x.nextActionDate),
    projectId: x.projectId ?? null,
    lastActivityAt: toDate(x.lastActivityAt),
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

export const subscribeToProposals = (uid, onData, onError) =>
  onSnapshot(col(uid), (snap) => onData(snap.docs.map(fromDoc)), onError)

// Campos editáveis (status e projectId NÃO entram aqui: mudam só pelas ações com histórico/confirmação).
const fields = (v) => ({
  title: v.title.trim(),
  summary: v.summary.trim(),
  clientId: v.clientId,
  amount: roundMoney(Number(v.amount), v.currency),
  currency: v.currency,
  sentDate: v.sentDate ? Timestamp.fromDate(v.sentDate) : null,
  validUntil: v.validUntil ? Timestamp.fromDate(v.validUntil) : null,
  nextAction: v.nextAction.trim(),
  nextActionDate: v.nextActionDate ? Timestamp.fromDate(v.nextActionDate) : null,
  updatedAt: serverTimestamp(),
})

const addHistory = (batch, uid, id, entry) => batch.set(doc(histCol(uid, id)), { ...entry, at: serverTimestamp() })

export async function createProposal(uid, v) {
  const newRef = doc(col(uid))
  const batch = writeBatch(db)
  batch.set(newRef, { ...fields(v), status: v.status, projectId: null, lastActivityAt: serverTimestamp(), createdAt: serverTimestamp() })
  addHistory(batch, uid, newRef.id, { kind: 'created', from: null, to: v.status })
  await batch.commit()
  return newRef.id
}

export async function updateProposal(uid, id, v) {
  const batch = writeBatch(db)
  batch.update(ref(uid, id), fields(v))
  await batch.commit()
}

// Mudança de status: atualiza a proposta e registra no histórico (atômico). `projectId` opcional (aceite).
export async function changeProposalStatus(uid, proposal, next, { projectId } = {}) {
  const batch = writeBatch(db)
  const patch = { status: next, lastActivityAt: serverTimestamp(), updatedAt: serverTimestamp() }
  if (projectId !== undefined) patch.projectId = projectId
  batch.update(ref(uid, proposal.id), patch)
  addHistory(batch, uid, proposal.id, { kind: 'status', from: proposal.status, to: next })
  await batch.commit()
}

export async function registerContact(uid, id) {
  const batch = writeBatch(db)
  batch.update(ref(uid, id), { lastActivityAt: serverTimestamp(), updatedAt: serverTimestamp() })
  addHistory(batch, uid, id, { kind: 'contact', from: null, to: null })
  await batch.commit()
}

export async function linkProposalProject(uid, id, projectId) {
  const batch = writeBatch(db)
  batch.update(ref(uid, id), { projectId: projectId || null, updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function deleteProposal(uid, id) {
  const history = await getDocs(histCol(uid, id))
  const batch = writeBatch(db)
  history.forEach((h) => batch.delete(h.ref))
  batch.delete(ref(uid, id))
  await batch.commit()
}

const hFrom = (s) => { const x = s.data(); return { id: s.id, kind: x.kind ?? 'status', from: x.from ?? null, to: x.to ?? null, at: toDate(x.at) } }
export const subscribeToHistory = (uid, id, onData, onError) =>
  onSnapshot(histCol(uid, id), (snap) => {
    const list = snap.docs.map(hFrom)
    list.sort((a, b) => (b.at?.getTime() ?? Date.now()) - (a.at?.getTime() ?? Date.now()))
    onData(list)
  }, onError)

export function proposalErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar as propostas. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Esta proposta não existe mais. Volte para a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
