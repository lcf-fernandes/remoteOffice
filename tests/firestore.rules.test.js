// Testes das regras do Firestore. Rodam no emulador: npm run test:rules (requer Java e firebase-tools).
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

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
  it('propostas: dono grava; valor, moeda, status e cliente validados; histórico imutável', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const pr = { title: 'Site', summary: '', clientId: 'c1', amount: 4200.5, currency: 'BRL', sentDate: null, validUntil: null, status: 'sent', nextAction: '', nextActionDate: null, projectId: null, lastActivityAt: Timestamp.now() }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/proposals/p1'), pr))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p2'), { ...pr, amount: '4200' }))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p3'), { ...pr, amount: -1 }))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p4'), { ...pr, currency: 'XYZ' }))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p5'), { ...pr, status: 'fechada' }))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p6'), { ...pr, clientId: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p7'), { ...pr, title: '' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/proposals/p8'), pr))
    const h = { kind: 'status', from: 'draft', to: 'sent', at: Timestamp.now() }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/proposals/p1/history/h1'), h))
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p1/history/h1'), { ...h, to: 'accepted' })) // sem edição
    await assertFails(setDoc(doc(alice, 'users/alice/proposals/p1/history/h2'), { ...h, kind: 'outro' }))
  })
  it('financeiro: valor positivo, moeda/tipo/status válidos; pago exige data de pagamento', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const due = Timestamp.fromDate(new Date(2026, 9, 20))
    const tx = { description: 'Parcela 1/2', type: 'income', amount: 1800, currency: 'BRL', status: 'pending', dueDate: due, paidDate: null, category: '', clientId: null, projectId: null, notes: '' }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/transactions/t1'), tx))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/transactions/t2'), { ...tx, status: 'paid', paidDate: Timestamp.now() }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t3'), { ...tx, status: 'paid', paidDate: null }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t4'), { ...tx, paidDate: Timestamp.now() })) // pendente não tem pagamento
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t5'), { ...tx, amount: 0 }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t6'), { ...tx, amount: '10' }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t7'), { ...tx, currency: 'XYZ' }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t8'), { ...tx, type: 'transferencia' }))
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t9'), { ...tx, status: 'overdue' })) // vencido é derivado, não gravado
    await assertFails(setDoc(doc(alice, 'users/alice/transactions/t10'), { ...tx, dueDate: null }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/transactions/t11'), tx))
  })
  it('cronômetro: só um ativo; segundo início é negado; início é a hora do servidor', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const timer = { start: serverTimestamp(), description: '', taskId: null, projectId: null, billable: false }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/timer/current'), timer))
    await assertFails(setDoc(doc(alice, 'users/alice/timer/current'), { ...timer, start: serverTimestamp() })) // trocar o início = novo cronômetro
    await assertSucceeds(setDoc(doc(alice, 'users/alice/timer/current'), { ...(await getDoc(doc(alice, 'users/alice/timer/current'))).data(), description: 'editado' }))
    await assertFails(setDoc(doc(alice, 'users/alice/timer/outro'), timer)) // só o ID fixo "current"
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/timer/current')))
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/timer/current')))
    await assertFails(setDoc(doc(alice, 'users/alice/timer/current'), { ...timer, start: Timestamp.fromDate(new Date(2020, 0, 1)) })) // início forjado
  })
  it('registros de tempo: duração coerente, máximo 24 h, fim > início; revisões imutáveis', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const start = Timestamp.fromDate(new Date(2026, 9, 10, 9, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 10, 10, 30))
    const entry = { description: 'Edição', taskId: null, projectId: null, start, end, durationSeconds: 5400, billable: false, source: 'manual', revisionCount: 0 }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/timeEntries/e1'), entry))
    await assertFails(setDoc(doc(alice, 'users/alice/timeEntries/e2'), { ...entry, durationSeconds: 9999 })) // duração incoerente
    await assertFails(setDoc(doc(alice, 'users/alice/timeEntries/e3'), { ...entry, end: start, durationSeconds: 0 })) // fim = início
    await assertFails(setDoc(doc(alice, 'users/alice/timeEntries/e4'), { ...entry, end: Timestamp.fromDate(new Date(2026, 9, 11, 10, 0)), durationSeconds: 90000 })) // > 24 h
    await assertFails(setDoc(doc(alice, 'users/alice/timeEntries/e5'), { ...entry, source: 'robo' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/timeEntries/e6'), entry))
    const rev = { before: { description: 'x', durationSeconds: 60 }, at: Timestamp.now() }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/timeEntries/e1/revisions/r1'), rev))
    await assertFails(setDoc(doc(alice, 'users/alice/timeEntries/e1/revisions/r1'), { ...rev, at: Timestamp.now() })) // sem edição
  })
  it('notas e registro de trabalho: validação de conteúdo, limites e vínculos', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const note = { title: '', content: 'Ideia rápida', tags: ['ideia'], clientId: null, projectId: null, taskId: null }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/notes/n1'), note))
    await assertFails(setDoc(doc(alice, 'users/alice/notes/n2'), { ...note, content: '' }))
    await assertFails(setDoc(doc(alice, 'users/alice/notes/n3'), { ...note, content: 'x'.repeat(10001) }))
    await assertFails(setDoc(doc(alice, 'users/alice/notes/n4'), { ...note, tags: Array(21).fill('a') }))
    await assertFails(setDoc(doc(alice, 'users/alice/notes/n5'), { ...note, role: 'admin' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/notes/n6'), note))
    const log = { date: Timestamp.fromDate(new Date(2026, 9, 10)), done: 'Corte final', blockers: '', nextStep: 'Exportar', clientId: null, projectId: null, taskId: null }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/workLog/l1'), log))
    await assertFails(setDoc(doc(alice, 'users/alice/workLog/l2'), { ...log, done: '', nextStep: '' })) // os três vazios
    await assertFails(setDoc(doc(alice, 'users/alice/workLog/l3'), { ...log, date: 'hoje' }))
    await assertFails(setDoc(doc(alice, 'users/alice/workLog/l4'), { ...log, done: 'x'.repeat(5001) }))
  })
  it('preferências: valores válidos, partes inválidas negadas, só o próprio usuário', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const profile = { email: 'a@x.com', displayName: '', preferences: { locale: 'pt-BR', currency: 'BRL', theme: 'system' } }
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile))
    const withPrefs = (preferences) => ({ ...profile, preferences })
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), withPrefs({ ...profile.preferences, theme: 'dark', dateStyle: 'iso', weekStart: 'mon', context: 'editing', hiddenBlocks: ['video'], externalLinks: [{ label: 'GitHub', url: 'https://github.com' }], followUpDays: 14 })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ theme: 'neon' })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ currency: 'XYZ' })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ context: 'lazer' })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ followUpDays: 5 })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ externalLinks: Array(11).fill({ label: 'x', url: 'https://a.co' }) })))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), withPrefs({ ...profile.preferences, alertDueSoonDays: 3, disabledAlerts: ['follow_up'] })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ alertDueSoonDays: 5 })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ disabledAlerts: Array(11).fill('follow_up') })))
    await assertFails(setDoc(doc(alice, 'users/alice'), withPrefs({ isAdmin: true }))) // chave desconhecida
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice'), profile))
  })
  it('modelos: tipo e tamanho da lista; criação em lote de projeto + tarefas respeita as regras', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const tpl = { name: 'Vídeo', description: '', projectType: 'editing', tasks: [{ title: 'Briefing', description: '', priority: 'high', offsetDays: 2, category: '' }] }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/templates/t1'), tpl))
    await assertFails(setDoc(doc(alice, 'users/alice/templates/t2'), { ...tpl, tasks: [] }))
    await assertFails(setDoc(doc(alice, 'users/alice/templates/t3'), { ...tpl, tasks: Array(31).fill(tpl.tasks[0]) }))
    await assertFails(setDoc(doc(alice, 'users/alice/templates/t4'), { ...tpl, projectType: 'outro' }))
    await assertFails(setDoc(doc(alice, 'users/alice/templates/t5'), { ...tpl, name: '' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/templates/t6'), tpl))
    // a criação a partir de modelo grava um projeto e tarefas no formato que as regras já exigem
    const project = { name: 'Vídeo X', description: '', clientId: null, type: 'editing', status: 'planning', priority: 'medium', startDate: null, dueDate: null, links: [] }
    const task = { title: 'Briefing', description: '', status: 'todo', priority: 'high', due: null, category: '', tags: [], clientId: null, projectId: 'p-x', completedAt: null }
    await assertSucceeds(setDoc(doc(alice, 'users/alice/projects/p-x'), project))
    await assertSucceeds(setDoc(doc(alice, 'users/alice/tasks/tt1'), task))
  })
  it('nega subcoleções não listadas', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice/segredos/n1'), { a: 1 }))
  })
  it('nega coleções fora de users/', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'public/x'), { a: 1 }))
  })
})
