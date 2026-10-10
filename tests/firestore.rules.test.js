// Testes das regras do Firestore. Rodam no emulador: npm run test:rules (requer Java e firebase-tools).
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'

let env
const task = { title: 'Teste', description: '', status: 'todo', priority: 'medium', due: null, category: '', tags: [] }
const profile = { email: 'a@x.com', displayName: '', preferences: { locale: 'pt-BR' } }

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'leandro-desk-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(() => env.cleanup())

describe('firestore.rules', () => {
  it('nega leitura para usuário não autenticado', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')))
  })
  it('permite ao dono criar e ler o próprio perfil', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
  })
  it('nega acesso ao perfil de outro usuário', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice')))
    await assertFails(setDoc(doc(db, 'users/alice'), profile))
  })
  it('nega campos extras no perfil (ex.: role)', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertFails(setDoc(doc(db, 'users/carol'), { ...profile, role: 'admin' }))
  })
  it('permite ao dono criar, ler e excluir tarefa válida; nega a outros', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'users/alice/tasks/t1'), task))
    await assertSucceeds(getDoc(doc(alice, 'users/alice/tasks/t1')))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/tasks/t2'), task))
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/tasks/t1')))
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/tasks/t1')))
  })
  it('nega tarefa inválida (status, título vazio, campo extra)', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'users/alice/tasks/x1'), { ...task, status: 'qualquer' }))
    await assertFails(setDoc(doc(alice, 'users/alice/tasks/x2'), { ...task, title: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/tasks/x3'), { ...task, role: 'admin' }))
  })
  it('clientes: dono grava e lê; outros não; dados inválidos são negados', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const client = { name: 'Ana', company: '', email: '', phone: '', source: '', status: 'lead', notes: '', nextAction: '', nextActionDate: null }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/clients/c1'), client))
    await assertSucceeds(getDoc(doc(alice, 'users/alice/clients/c1')))
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/clients/c1')))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c2'), { ...client, name: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c3'), { ...client, status: 'vip' }))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c4'), { ...client, role: 'admin' }))
  })
  it('interações: validação de tipo, resumo e data', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const ok = { date: Timestamp.now(), type: 'call', summary: 'Conversamos sobre o escopo' }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/clients/c1/interactions/i1'), ok))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c1/interactions/i2'), { ...ok, type: 'telepatia' }))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c1/interactions/i3'), { ...ok, summary: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/clients/c1/interactions/i4'), { ...ok, date: 'ontem' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/clients/c1/interactions/i5'), ok))
  })
  it('projetos, marcos e diário: dono grava; dados inválidos e outros usuários são negados', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const project = { name: 'Site', description: '', clientId: null, type: 'development', status: 'planning', priority: 'medium', startDate: null, dueDate: null, links: ['https://exemplo.com'] }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/projects/p1'), project))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p2'), { ...project, name: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p3'), { ...project, type: 'outro' }))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p4'), { ...project, status: 'x' }))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p5'), { ...project, links: Array(11).fill('https://a.co') }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/projects/p6'), project))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/projects/p1/milestones/m1'), { title: 'Entrega 1', date: null, done: false }))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p1/milestones/m2'), { title: 'x', date: null, done: 'sim' }))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/projects/p1/journal/j1'), { date: Timestamp.now(), text: 'Reunião de kickoff' }))
    await assertFails(setDoc(doc(alice, 'users/alice/projects/p1/journal/j2'), { date: Timestamp.now(), text: '' }))
  })
  it('eventos: dono grava; início obrigatório, fim >= início, tipo e lembrete válidos', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const start = Timestamp.fromDate(new Date(2026, 9, 10, 10, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 10, 11, 0))
    const ev = { title: 'Reunião', type: 'meeting', allDay: false, start, end, description: '', projectId: null, reminderMinutes: 30 }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/events/e1'), ev))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/events/e2'), { ...ev, end: null, reminderMinutes: null }))
    await assertFails(setDoc(doc(alice, 'users/alice/events/e3'), { ...ev, end: Timestamp.fromDate(new Date(2026, 9, 10, 9, 0)) }))
    await assertFails(setDoc(doc(alice, 'users/alice/events/e4'), { ...ev, type: 'festa' }))
    await assertFails(setDoc(doc(alice, 'users/alice/events/e5'), { ...ev, reminderMinutes: 7 }))
    await assertFails(setDoc(doc(alice, 'users/alice/events/e6'), { ...ev, start: 'amanhã' }))
    await assertFails(setDoc(doc(alice, 'users/alice/events/e7'), { ...ev, title: '' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/events/e8'), ev))
  })
  it('nega subcoleções não listadas', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice/notes/n1'), { a: 1 }))
  })
  it('nega coleções fora de users/', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'public/x'), { a: 1 }))
  })
})
