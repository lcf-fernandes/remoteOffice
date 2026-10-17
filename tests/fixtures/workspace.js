// Dados semeados realistas, compartilhados pelos testes de interface (Vitest) e pelo teste de layout no navegador (tests/e2e).
import { Timestamp, seedDoc } from '../ui/fake-firebase/store.js'

export const UID = 'u1'

export const day = (offset = 0, h = 0, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return Timestamp.fromDate(d) }

export function seedProfile(uid = UID, email = 'leandro@teste.com', extra = {}) {
  seedDoc(`users/${uid}`, { email, displayName: 'Leandro', preferences: { locale: 'pt-BR', currency: 'BRL', theme: 'light', ...extra }, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
}

// Conjunto realista de dados em todos os módulos.
export function seedWorkspace(uid = UID) {
  const p = (...parts) => ['users', uid, ...parts].join('/')
  const now = Timestamp.now()
  seedDoc(p('clients', 'c1'), { name: 'Ana Souza', company: 'Studio Zeta', email: 'ana@zeta.co', phone: '+55 11 99999-0000', source: 'Indicação', status: 'active', notes: 'Prefere contato por e-mail', nextAction: 'Enviar orçamento', nextActionDate: day(-1), createdAt: now, updatedAt: now })
  seedDoc(p('clients', 'c1', 'interactions', 'i1'), { date: day(-3), type: 'call', summary: 'Alinhamento do escopo', createdAt: now })
  seedDoc(p('projects', 'p1'), { name: 'Site da agência', description: 'Site institucional', clientId: 'c1', type: 'development', status: 'active', priority: 'high', startDate: day(-20), dueDate: day(1), links: ['https://github.com/leandro/site-agencia'], createdAt: now, updatedAt: now })
  seedDoc(p('projects', 'p2'), { name: 'Vídeo institucional', description: '', clientId: 'c1', type: 'editing', status: 'review', priority: 'medium', startDate: day(-10), dueDate: day(12), links: [], createdAt: now, updatedAt: now })
  seedDoc(p('projects', 'p3'), { name: 'App de agendamento', description: '', clientId: null, type: 'development', status: 'waiting_client', priority: 'low', startDate: null, dueDate: null, links: [], createdAt: now, updatedAt: now })
  seedDoc(p('projects', 'p1', 'milestones', 'm1'), { title: 'Layout aprovado', date: day(2), done: false, createdAt: now })
  seedDoc(p('projects', 'p1', 'journal', 'j1'), { date: day(-1), text: 'Reunião de kickoff', createdAt: now })
  seedDoc(p('tasks', 't1'), { title: 'Corrigir menu responsivo', description: '', status: 'in_progress', priority: 'high', due: day(-2), category: 'Desenvolvimento', tags: ['css'], clientId: 'c1', projectId: 'p1', completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(p('tasks', 't2'), { title: 'Revisar legendas', description: '', status: 'todo', priority: 'medium', due: day(0), category: 'Vídeo', tags: [], clientId: 'c1', projectId: 'p2', completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(p('tasks', 't3'), { title: 'Tarefa solta sem prazo', description: '', status: 'todo', priority: 'low', due: null, category: '', tags: [], clientId: null, projectId: null, completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(p('tasks', 't4'), { title: 'Concluída', description: '', status: 'done', priority: 'low', due: day(-5), category: '', tags: [], clientId: null, projectId: 'p1', completedAt: now, createdAt: now, updatedAt: now })
  seedDoc(p('events', 'e1'), { title: 'Reunião de alinhamento', type: 'meeting', allDay: false, start: day(0, 10, 0), end: day(0, 10, 45), description: '', projectId: 'p1', reminderMinutes: 30, createdAt: now, updatedAt: now })
  seedDoc(p('events', 'e2'), { title: 'Entrega do vídeo', type: 'milestone', allDay: true, start: day(3), end: null, description: '', projectId: 'p2', reminderMinutes: null, createdAt: now, updatedAt: now })
  seedDoc(p('proposals', 'r1'), { title: 'Redesign de landing page', summary: 'Proposta', clientId: 'c1', amount: 4200.5, currency: 'BRL', sentDate: day(-20), validUntil: day(10), status: 'sent', nextAction: 'Ligar', nextActionDate: null, projectId: null, lastActivityAt: day(-15), createdAt: day(-20), updatedAt: day(-15) })
  seedDoc(p('proposals', 'r1', 'history', 'h1'), { kind: 'created', from: null, to: 'sent', at: day(-20) })
  seedDoc(p('transactions', 'x1'), { description: 'Parcela 2/3', type: 'income', amount: 1800, currency: 'BRL', status: 'pending', dueDate: day(-3), paidDate: null, category: 'Projeto', clientId: 'c1', projectId: 'p1', notes: '', createdAt: now, updatedAt: now })
  seedDoc(p('transactions', 'x2'), { description: 'Hospedagem', type: 'expense', amount: 25.9, currency: 'USD', status: 'paid', dueDate: day(-1), paidDate: day(-1), category: 'Hospedagem', clientId: null, projectId: null, notes: '', createdAt: now, updatedAt: now })
  seedDoc(p('timeEntries', 'te1'), { description: 'Edição', taskId: 't2', projectId: 'p2', start: day(0, 8, 0), end: day(0, 9, 30), durationSeconds: 5400, billable: true, source: 'manual', revisionCount: 0, createdAt: now, updatedAt: now })
  seedDoc(p('notes', 'n1'), { title: 'Ideia', content: 'Usar Firestore para tudo', tags: ['ideia'], clientId: 'c1', projectId: null, taskId: null, createdAt: now, updatedAt: now })
  seedDoc(p('workLog', 'w1'), { date: day(-1), done: 'Montei o layout', blockers: 'Aguardando logo', nextStep: 'Implementar menu', clientId: 'c1', projectId: 'p1', taskId: null, createdAt: now, updatedAt: now })
  seedDoc(p('templates', 'tp1'), { name: 'Meu modelo', description: 'Modelo próprio', projectType: 'development', tasks: [{ title: 'Briefing', description: '', priority: 'high', offsetDays: 2, category: 'Planejamento' }, { title: 'Entrega', description: '', priority: 'medium', offsetDays: 10, category: '' }], createdAt: now, updatedAt: now })
}

// ---- Casos extremos de conteúdo (usados pelo teste de layout no navegador) ----
const LONG = 'SupercalifragilisticoexpialidosoSupercalifragilisticoexpialidosoSupercalifragilisticoexpialidoso'.repeat(1) // ~95 caracteres sem espaço
const LONG_URL = `https://exemplo.org/${'caminho-muito-longo-sem-quebra/'.repeat(8)}arquivo.html`
const LONG_SENTENCE = 'Este é um título muito longo que descreve com detalhes excessivos o trabalho a ser feito para o cliente, incluindo vários passos, observações e ressalvas importantes. '.repeat(1)

export function seedLongText(uid = UID) {
  const p = (...parts) => ['users', uid, ...parts].join('/')
  const now = Timestamp.now()
  seedDoc(p('clients', 'cl-long'), { name: LONG, company: LONG_SENTENCE, email: `${'nome.muito.longo'.repeat(5)}@dominio-extenso-de-teste.com.br`, phone: '+55 (11) 99999-9999', source: LONG, status: 'active', notes: LONG_SENTENCE.repeat(6), nextAction: LONG_SENTENCE, nextActionDate: day(-1), createdAt: now, updatedAt: now })
  seedDoc(p('projects', 'pl-long'), { name: LONG, description: LONG_SENTENCE.repeat(5), clientId: 'cl-long', type: 'development', status: 'active', priority: 'high', startDate: day(-5), dueDate: day(2), links: [LONG_URL, 'https://github.com/' + 'org-com-nome-enorme/'.repeat(5)], createdAt: now, updatedAt: now })
  seedDoc(p('tasks', 'tl-long'), { title: LONG, description: LONG_SENTENCE.repeat(4), status: 'todo', priority: 'high', due: day(-1), category: LONG, tags: [LONG, 'tag-curta'], clientId: 'cl-long', projectId: 'pl-long', completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(p('tasks', 'tl-long2'), { title: LONG_SENTENCE, description: '', status: 'in_progress', priority: 'medium', due: day(0), category: '', tags: [], clientId: null, projectId: null, completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(p('proposals', 'rl-long'), { title: LONG, summary: LONG_SENTENCE.repeat(4), clientId: 'cl-long', amount: 999999999999.99, currency: 'BRL', sentDate: day(-20), validUntil: day(-1), status: 'sent', nextAction: LONG_SENTENCE, nextActionDate: day(-1), projectId: null, lastActivityAt: day(-30), createdAt: day(-30), updatedAt: day(-30) })
  seedDoc(p('transactions', 'xl-long'), { description: LONG, type: 'income', amount: 999999999999.99, currency: 'BRL', status: 'pending', dueDate: day(-2), paidDate: null, category: LONG, clientId: 'cl-long', projectId: 'pl-long', notes: LONG_SENTENCE.repeat(3), createdAt: now, updatedAt: now })
  seedDoc(p('events', 'el-long'), { title: LONG, type: 'meeting', allDay: false, start: day(0, 9, 0), end: day(0, 10, 0), description: LONG_SENTENCE, projectId: 'pl-long', reminderMinutes: null, createdAt: now, updatedAt: now })
  seedDoc(p('notes', 'nl-long'), { title: LONG, content: LONG_SENTENCE.repeat(8) + LONG_URL, tags: [LONG], clientId: 'cl-long', projectId: 'pl-long', taskId: 'tl-long', createdAt: now, updatedAt: now })
  seedDoc(p('workLog', 'wl-long'), { date: day(0), done: LONG_SENTENCE.repeat(3), blockers: LONG, nextStep: LONG_URL, clientId: 'cl-long', projectId: 'pl-long', taskId: null, createdAt: now, updatedAt: now })
  seedDoc(p('templates', 'tpl-long'), { name: LONG, description: LONG_SENTENCE, projectType: 'development', tasks: [{ title: LONG, description: '', priority: 'high', offsetDays: 3, category: LONG }], createdAt: now, updatedAt: now })
  seedDoc(p('timeEntries', 'tel-long'), { description: LONG, taskId: 'tl-long', projectId: 'pl-long', start: day(0, 6, 0), end: day(0, 7, 30), durationSeconds: 5400, billable: true, source: 'manual', revisionCount: 2, createdAt: now, updatedAt: now })
}

// Muitos registros (desempenho e rolagem). Cada coleção ganha `n` itens.
export function seedBig(uid = UID, n = 1200) {
  const p = (...parts) => ['users', uid, ...parts].join('/')
  const now = Timestamp.now()
  for (let i = 0; i < n; i++) {
    seedDoc(p('tasks', `bt${i}`), { title: `Tarefa em massa número ${i}`, description: '', status: i % 5 === 0 ? 'done' : 'todo', priority: ['low', 'medium', 'high'][i % 3], due: day((i % 40) - 10), category: `Categoria ${i % 12}`, tags: [`t${i % 7}`], clientId: null, projectId: null, completedAt: null, createdAt: now, updatedAt: now })
    if (i < n / 4) seedDoc(p('clients', `bc${i}`), { name: `Cliente em massa ${i}`, company: `Empresa ${i % 30}`, email: '', phone: '', source: '', status: ['lead', 'active', 'inactive'][i % 3], notes: '', nextAction: '', nextActionDate: null, createdAt: now, updatedAt: now })
    if (i < n / 6) seedDoc(p('notes', `bn${i}`), { title: `Nota ${i}`, content: `Conteúdo da nota ${i}`, tags: [`t${i % 5}`], clientId: null, projectId: null, taskId: null, createdAt: now, updatedAt: now })
    if (i < n / 3) seedDoc(p('transactions', `bx${i}`), { description: `Lançamento ${i}`, type: i % 2 ? 'income' : 'expense', amount: 10 + i, currency: ['BRL', 'USD'][i % 2], status: ['pending', 'paid', 'planned'][i % 3], dueDate: day((i % 60) - 20), paidDate: i % 3 === 1 ? day(-1) : null, category: '', clientId: null, projectId: null, notes: '', createdAt: now, updatedAt: now })
    if (i < n / 4) seedDoc(p('timeEntries', `be${i}`), { description: `Registro ${i}`, taskId: null, projectId: null, start: day(-(i % 25), 8, 0), end: day(-(i % 25), 9, 0), durationSeconds: 3600, billable: i % 4 === 0, source: 'manual', revisionCount: 0, createdAt: now, updatedAt: now })
  }
}
