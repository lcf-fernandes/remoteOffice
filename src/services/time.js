// Commit 16 — registros de tempo no Firestore.
//   users/{uid}/timer/current               cronômetro ativo (no máximo um: documento de ID fixo)
//   users/{uid}/timeEntries/{id}            registros finalizados (+ /revisions/{id} com valores anteriores)
// O início do cronômetro usa a hora do SERVIDOR; a duração sai de timestamps, então sobrevive a recarregar a página.
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, runTransaction, serverTimestamp, Timestamp, updateDoc, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { durationSeconds } from '../utils/time.js'

const timerRef = (uid) => doc(db, 'users', uid, 'timer', 'current')
const entriesCol = (uid) => collection(db, 'users', uid, 'timeEntries')
const entryRef = (uid, id) => doc(db, 'users', uid, 'timeEntries', id)
const revCol = (uid, id) => collection(db, 'users', uid, 'timeEntries', id, 'revisions')
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null)

// ---- cronômetro ativo ----
export const subscribeToTimer = (uid, onData, onError) =>
  onSnapshot(timerRef(uid), (snap) => {
    if (!snap.exists()) return onData(null)
    const x = snap.data({ serverTimestamps: 'estimate' })
    onData({ start: toDate(x.start), description: x.description ?? '', taskId: x.taskId ?? null, projectId: x.projectId ?? null, billable: !!x.billable })
  }, onError)

// Transação: se já existe cronômetro ativo (em qualquer aba/aparelho), falha — nunca há dois.
export function startTimer(uid, { description = '', taskId = null, projectId = null, billable = false } = {}) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(timerRef(uid))
    if (snap.exists()) throw Object.assign(new Error('timer-active'), { code: 'timer-active' })
    tx.set(timerRef(uid), { start: serverTimestamp(), description: description.trim(), taskId, projectId, billable })
  })
}

export const updateActiveTimer = (uid, fields) => updateDoc(timerRef(uid), fields) // não altera `start`
export const discardTimer = (uid) => deleteDoc(timerRef(uid))

// Encerra: grava o registro final e apaga o cronômetro, de forma atômica.
export function stopTimer(uid, { end, description, billable }) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(timerRef(uid))
    if (!snap.exists()) throw Object.assign(new Error('no-timer'), { code: 'no-timer' })
    const x = snap.data({ serverTimestamps: 'estimate' })
    const start = x.start.toDate()
    if (end <= start) throw Object.assign(new Error('bad-range'), { code: 'bad-range' })
    tx.set(doc(entriesCol(uid)), {
      description: description.trim(), taskId: x.taskId ?? null, projectId: x.projectId ?? null,
      start: x.start, end: Timestamp.fromDate(end), durationSeconds: durationSeconds(start, end),
      billable: !!billable, source: 'timer', revisionCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    tx.delete(timerRef(uid))
  })
}

// ---- registros ----
function entryFrom(snap) {
  const x = snap.data()
  const start = toDate(x.start), end = toDate(x.end)
  return {
    id: snap.id, description: x.description ?? '', taskId: x.taskId ?? null, projectId: x.projectId ?? null, start, end,
    durationSeconds: typeof x.durationSeconds === 'number' ? x.durationSeconds : start && end ? durationSeconds(start, end) : 0,
    billable: !!x.billable, source: x.source ?? 'manual', revisionCount: x.revisionCount ?? 0,
    createdAt: toDate(x.createdAt), updatedAt: toDate(x.updatedAt),
  }
}
export const subscribeToEntries = (uid, onData, onError) =>
  onSnapshot(entriesCol(uid), (snap) => onData(snap.docs.map(entryFrom).filter((e) => e.start && e.end).sort((a, b) => b.start - a.start)), onError)

const fields = (v) => ({
  description: v.description.trim(), taskId: v.taskId || null, projectId: v.projectId || null,
  start: Timestamp.fromDate(v.start), end: Timestamp.fromDate(v.end), durationSeconds: durationSeconds(v.start, v.end), billable: !!v.billable,
})

export const createManualEntry = (uid, v) =>
  addDoc(entriesCol(uid), { ...fields(v), source: 'manual', revisionCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

// Ajuste: guarda os valores ANTERIORES em /revisions antes de alterar (nada some silenciosamente). Atômico.
export async function updateEntry(uid, previous, v) {
  const batch = writeBatch(db)
  batch.set(doc(revCol(uid, previous.id)), {
    before: {
      description: previous.description, taskId: previous.taskId, projectId: previous.projectId,
      start: Timestamp.fromDate(previous.start), end: Timestamp.fromDate(previous.end), durationSeconds: previous.durationSeconds, billable: previous.billable,
    },
    at: serverTimestamp(),
  })
  batch.update(entryRef(uid, previous.id), { ...fields(v), revisionCount: previous.revisionCount + 1, updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function deleteEntry(uid, id) {
  const revs = await getDocs(revCol(uid, id))
  const batch = writeBatch(db)
  revs.forEach((r) => batch.delete(r.ref))
  batch.delete(entryRef(uid, id))
  await batch.commit()
}

export const subscribeToRevisions = (uid, id, onData, onError) =>
  onSnapshot(revCol(uid, id), (snap) => {
    const list = snap.docs.map((s) => {
      const x = s.data(), b = x.before ?? {}
      return { id: s.id, at: toDate(x.at), before: { description: b.description ?? '', start: toDate(b.start), end: toDate(b.end), durationSeconds: b.durationSeconds ?? 0, billable: !!b.billable } }
    })
    list.sort((a, b) => (b.at?.getTime() ?? Date.now()) - (a.at?.getTime() ?? Date.now()))
    onData(list)
  }, onError)

export function timeErrorMessage(error) {
  switch (error?.code) {
    case 'timer-active':
      return 'Já existe um cronômetro ativo. Pare ou descarte o atual antes de iniciar outro.'
    case 'no-timer':
      return 'Não há cronômetro ativo (ele pode ter sido encerrado em outra aba ou aparelho).'
    case 'bad-range':
      return 'O fim precisa ser depois do início do cronômetro.'
    case 'permission-denied':
      return 'Sem permissão para acessar o registro de tempo. Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).'
    case 'not-found':
      return 'Este registro não existe mais. Atualize a lista.'
    case 'unavailable':
    case 'failed-precondition':
      return 'Sem conexão com o servidor. Tente novamente quando a conexão voltar.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
