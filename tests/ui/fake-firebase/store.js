// Firebase SIMULADO em memória, só para testes de interface. Reproduz a API que o app usa (documentos, coleções,
// consultas "==", lotes, transações, tempo real, falhas injetadas). NÃO simula as regras de segurança do Firestore.
export class FirebaseError extends Error {
  constructor(code, message) { super(message ?? code); this.name = 'FirebaseError'; this.code = code }
}

export class Timestamp {
  constructor(ms) { this._ms = ms }
  static now() { return new Timestamp(Date.now()) }
  static fromDate(d) { return new Timestamp(d.getTime()) }
  static fromMillis(ms) { return new Timestamp(ms) }
  toDate() { return new Date(this._ms) }
  toMillis() { return this._ms }
  get seconds() { return Math.floor(this._ms / 1000) }
  get nanoseconds() { return (this._ms % 1000) * 1e6 }
}
export const serverTimestamp = () => ({ __sentinel: 'serverTimestamp' })

const docs = new Map() // caminho → dados
const listeners = new Set()
let idCounter = 0
let failure = null // { code, ops: Set|null }
const writeLog = [] // registro de operações (para os testes conferirem atomicidade)

export const db = { __fake: true }
export function resetStore() { docs.clear(); listeners.clear(); idCounter = 0; failure = null; writeLog.length = 0 }
export const getWriteLog = () => writeLog
// Faz as próximas operações falharem com o código dado (ex.: 'unavailable', 'permission-denied'). ops: 'read' | 'write' | ambos.
export function failAll(code, ops = ['read', 'write']) { failure = { code, ops: new Set(ops) } }
export function clearFailure() { failure = null }
function maybeFail(kind) { if (failure && failure.ops.has(kind)) throw new FirebaseError(failure.code) }

const clone = (v) => {
  if (v instanceof Timestamp) return new Timestamp(v._ms)
  if (Array.isArray(v)) return v.map(clone)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))
  return v
}
const resolve = (v) => {
  if (v && v.__sentinel === 'serverTimestamp') return Timestamp.now()
  if (v instanceof Timestamp) return v
  if (Array.isArray(v)) return v.map(resolve)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]))
  return v
}

export const docRef = (path) => ({ type: 'document', path, id: path.split('/').pop(), parentPath: path.split('/').slice(0, -1).join('/') })
export const colRef = (path) => ({ type: 'collection', path, id: path.split('/').pop() })

export function collection(_db, ...segments) { return colRef(segments.join('/')) }
export function doc(first, ...segments) {
  if (first && first.type === 'collection') return docRef(`${first.path}/doc${++idCounter}`) // ID automático
  return docRef(segments.join('/'))
}
export const where = (field, op, value) => ({ kind: 'where', field, op, value })
export function query(col, ...constraints) { return { type: 'query', path: col.path, constraints } }

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const isChild = (path, colPath) => path.startsWith(`${colPath}/`) && path.slice(colPath.length + 1).split('/').length === 1

function snapDoc(path) {
  const data = docs.get(path)
  const ref = docRef(path)
  return { id: ref.id, ref, exists: () => data !== undefined, data: () => (data === undefined ? undefined : clone(data)) }
}
function snapQuery(target) {
  const colPath = target.path
  const constraints = target.constraints ?? []
  const list = [...docs.keys()].filter((p) => isChild(p, colPath)).sort()
    .filter((p) => constraints.every((c) => c.op === '==' ? get(docs.get(p), c.field) === c.value : true))
    .map(snapDoc)
  return { docs: list, size: list.length, empty: list.length === 0, forEach: (fn) => list.forEach(fn) }
}
const snapFor = (target) => (target.type === 'document' ? snapDoc(target.path) : snapQuery(target))

function notify() {
  for (const l of [...listeners]) {
    queueMicrotask(() => { if (listeners.has(l)) l.next(snapFor(l.target)) })
  }
}

function applyPatch(base, patch) {
  const out = clone(base)
  for (const [key, value] of Object.entries(patch)) {
    const parts = key.split('.')
    let o = out
    parts.slice(0, -1).forEach((k) => { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k] })
    o[parts[parts.length - 1]] = resolve(value)
  }
  return out
}

function applyOp(op) {
  if (op.type === 'set') docs.set(op.path, clone(resolve(op.data)))
  else if (op.type === 'update') {
    if (!docs.has(op.path)) throw new FirebaseError('not-found', `No document to update: ${op.path}`)
    docs.set(op.path, applyPatch(docs.get(op.path), op.data))
  } else if (op.type === 'delete') docs.delete(op.path)
  writeLog.push(op.type + ' ' + op.path)
}
function applyAtomically(ops) {
  const backup = new Map([...docs].map(([k, v]) => [k, clone(v)]))
  try { ops.forEach(applyOp) } catch (e) { docs.clear(); backup.forEach((v, k) => docs.set(k, v)); throw e }
  notify()
}

export async function getDoc(ref) { maybeFail('read'); return snapDoc(ref.path) }
export async function getDocs(target) { maybeFail('read'); return snapQuery(target) }
export async function setDoc(ref, data) { maybeFail('write'); applyAtomically([{ type: 'set', path: ref.path, data }]) }
export async function addDoc(col, data) { maybeFail('write'); const ref = docRef(`${col.path}/auto${++idCounter}`); applyAtomically([{ type: 'set', path: ref.path, data }]); return ref }
export async function updateDoc(ref, patch) { maybeFail('write'); applyAtomically([{ type: 'update', path: ref.path, data: patch }]) }
export async function deleteDoc(ref) { maybeFail('write'); applyAtomically([{ type: 'delete', path: ref.path }]) }

export function writeBatch() {
  const ops = []
  const batch = {
    set: (ref, data) => { ops.push({ type: 'set', path: ref.path, data }); return batch },
    update: (ref, data) => { ops.push({ type: 'update', path: ref.path, data }); return batch },
    delete: (ref) => { ops.push({ type: 'delete', path: ref.path }); return batch },
    commit: async () => { maybeFail('write'); applyAtomically(ops) }, // tudo ou nada
  }
  return batch
}

export async function runTransaction(_db, fn) {
  maybeFail('write')
  const ops = []
  const tx = {
    get: async (ref) => snapDoc(ref.path),
    set: (ref, data) => { ops.push({ type: 'set', path: ref.path, data }); return tx },
    delete: (ref) => { ops.push({ type: 'delete', path: ref.path }); return tx },
    update: (ref, data) => { ops.push({ type: 'update', path: ref.path, data }); return tx },
  }
  const result = await fn(tx)
  applyAtomically(ops)
  return result
}

export function onSnapshot(target, next, error) {
  const l = { target, next, error }
  listeners.add(l)
  queueMicrotask(() => {
    if (!listeners.has(l)) return
    try { maybeFail('read') } catch (e) { error?.(e); return }
    next(snapFor(target))
  })
  return () => listeners.delete(l)
}

// Utilitários para os testes
export const readDoc = (path) => (docs.has(path) ? clone(docs.get(path)) : undefined)
export const listDocs = (colPath) => [...docs.keys()].filter((p) => isChild(p, colPath)).sort().map((p) => ({ id: p.split('/').pop(), ...clone(docs.get(p)) }))
export const seedDoc = (path, data) => { docs.set(path, clone(resolve(data))); notify() }
export const allPaths = () => [...docs.keys()].sort()
export function breakListeners(code) { for (const l of [...listeners]) l.error?.(new FirebaseError(code)) }
