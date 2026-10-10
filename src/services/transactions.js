// Commit 15 — lançamentos financeiros: users/{uid}/transactions/{id}.
// Apenas registro e acompanhamento. Não há integração bancária nem processamento de pagamentos.
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { roundMoney } from '../utils/proposals.js'

const col = (uid) => collection(db, 'users', uid, 'transactions')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

function fromDoc(snap) {
  const x = snap.data()
  return {
    id: snap.id,
    description: x.description ?? '',
    type: x.type ?? 'income',
    amount: typeof x.amount === 'number' ? x.amount : 0, // número na moeda `currency`
    currency: x.currency ?? 'BRL',
    status: x.status ?? 'pending',
    dueDate: toDate(x.dueDate),
    paidDate: toDate(x.paidDate),
    category: x.category ?? '',
    clientId: x.clientId ?? null,
    projectId: x.projectId ?? null,
    notes: x.notes ?? '',
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  }
}

export const subscribeToTransactions = (uid, onData, onError) =>
  onSnapshot(col(uid), (snap) => onData(snap.docs.map(fromDoc).filter((t) => t.dueDate)), onError)

const payload = (v) => ({
  description: v.description.trim(),
  type: v.type,
  amount: roundMoney(Number(v.amount), v.currency),
  currency: v.currency,
  status: v.status,
  dueDate: Timestamp.fromDate(v.dueDate),
  paidDate: v.status === 'paid' && v.paidDate ? Timestamp.fromDate(v.paidDate) : null,
  category: v.category.trim(),
  clientId: v.clientId || null,
  projectId: v.projectId || null,
  notes: v.notes.trim(),
  updatedAt: serverTimestamp(),
})

export const createTransaction = (uid, values) => addDoc(col(uid), { ...payload(values), createdAt: serverTimestamp() })
export const updateTransaction = (uid, id, values) => updateDoc(doc(db, 'users', uid, 'transactions', id), payload(values))
export const markTransactionPaid = (uid, id, paidDate) =>
  updateDoc(doc(db, 'users', uid, 'transactions', id), { status: 'paid', paidDate: Timestamp.fromDate(paidDate), updatedAt: serverTimestamp() })
export const deleteTransaction = (uid, id) => deleteDoc(doc(db, 'users', uid, 'transactions', id))

export function transactionErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Sem permissão para acessar o financeiro. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este lançamento não existe mais. Atualize a lista.'
    case 'unavailable':
      return 'Sem conexão com o servidor. Suas alterações serão enviadas quando a conexão voltar.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
