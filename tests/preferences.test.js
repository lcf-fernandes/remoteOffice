// Testes de preferências, contextos, estilo de data e início da semana (sem Firebase): npm test
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { CONTEXTS, contextTasks, isRepoLink, layoutFor, orderQuickActions, repoLinks, videoQueue } from '../src/utils/contexts.js'
import { DEFAULT_PREFS, BLOCK_IDS, MAX_EXTERNAL_LINKS, resolvePreferences, resolveTheme, validateExternalLink, weekStartDay } from '../src/utils/preferences.js'
import { formatDate, setDateStyle } from '../src/utils/format.js'
import { monthWeeks } from '../src/utils/agenda.js'

describe('resolvePreferences (padrões sensatos e valores inválidos)', () => {
  it('sem dados: tudo no padrão', () => assert.deepEqual(resolvePreferences(undefined), DEFAULT_PREFS))
  it('perfil antigo (locale/currency/theme) continua válido', () => {
    const p = resolvePreferences({ locale: 'pt-BR', currency: 'USD', theme: 'light' })
    assert.equal(p.currency, 'USD'); assert.equal(p.theme, 'light'); assert.equal(p.context, 'today'); assert.equal(p.weekStart, 'sun')
  })
  it('valores desconhecidos caem no padrão', () => {
    const p = resolvePreferences({ theme: 'neon', currency: 'XYZ', dateStyle: 'x', weekStart: 'qua', context: 'lazer', followUpDays: 5 })
    assert.deepEqual(p, DEFAULT_PREFS)
  })
  it('blocos ocultos: só ids conhecidos, sem repetição', () => assert.deepEqual(resolvePreferences({ hiddenBlocks: ['video', 'video', 'xyz', 'tasks'] }).hiddenBlocks, ['video', 'tasks']))
  it('atalhos inválidos (esquema perigoso, formato errado) são descartados', () => {
    const p = resolvePreferences({ externalLinks: [{ label: 'GitHub', url: 'https://github.com' }, { label: 'x', url: 'javascript:alert(1)' }, { label: 5, url: 'https://a.co' }, null] })
    assert.deepEqual(p.externalLinks, [{ label: 'GitHub', url: 'https://github.com' }])
  })
  it('alertas: limite de prazo e tipos desligados (inválidos descartados)', () => {
    assert.equal(resolvePreferences({}).alertDueSoonDays, 2); assert.deepEqual(resolvePreferences({}).disabledAlerts, [])
    assert.equal(resolvePreferences({ alertDueSoonDays: 7 }).alertDueSoonDays, 7); assert.equal(resolvePreferences({ alertDueSoonDays: 5 }).alertDueSoonDays, 2)
    assert.deepEqual(resolvePreferences({ disabledAlerts: ['follow_up', 'follow_up', 'xyz', 'task_overdue'] }).disabledAlerts, ['follow_up', 'task_overdue'])
  })
  it('follow-up: só 3/7/14/30; ausente = null', () => { assert.equal(resolvePreferences({ followUpDays: 14 }).followUpDays, 14); assert.equal(resolvePreferences({}).followUpDays, null) })
})

describe('tema e semana', () => {
  it('sistema segue o aparelho; claro/escuro são fixos', () => {
    assert.equal(resolveTheme('system', true), 'dark'); assert.equal(resolveTheme('system', false), 'light')
    assert.equal(resolveTheme('light', true), 'light'); assert.equal(resolveTheme('dark', false), 'dark')
  })
  it('início da semana', () => { assert.equal(weekStartDay('mon'), 1); assert.equal(weekStartDay('sun'), 0); assert.equal(weekStartDay(undefined), 0) })
  it('monthWeeks respeita o início da semana e cobre o mês inteiro', () => {
    for (const start of [0, 1]) {
      const weeks = monthWeeks(new Date(2026, 9, 1), start)
      assert.ok(weeks.every((w) => w.length === 7 && w[0].getDay() === start))
      const flat = weeks.flat()
      assert.ok(flat.some((d) => d.getMonth() === 9 && d.getDate() === 1) && flat.some((d) => d.getMonth() === 9 && d.getDate() === 31))
    }
    assert.equal(monthWeeks(new Date(2026, 9, 1), 1)[0][0].getDate(), 28) // 1/10/2026 é quinta-feira → semana começa em 28/09
  })
})

describe('estilo de data', () => {
  afterEach(() => setDateStyle('br'))
  const d = new Date(2026, 9, 5, 14, 30)
  it('ISO vale para datas sem dia da semana nem hora', () => {
    setDateStyle('iso'); assert.equal(formatDate(d), '2026-10-05'); assert.equal(formatDate(d, { day: '2-digit', month: 'long', year: 'numeric' }), '2026-10-05')
  })
  it('ISO não altera títulos com dia da semana nem horários', () => {
    setDateStyle('iso'); assert.match(formatDate(d, { weekday: 'long', day: '2-digit', month: 'long' }), /segunda/i); assert.match(formatDate(d, { hour: '2-digit', minute: '2-digit' }), /14:30/)
  })
  it('estilo brasileiro (padrão) e valor inválido', () => {
    assert.match(formatDate(d), /05/); assert.doesNotMatch(formatDate(d), /2026-/)
    setDateStyle('xyz'); assert.doesNotMatch(formatDate(d), /2026-/)
  })
})

describe('atalhos externos', () => {
  it('válido', () => assert.deepEqual(validateExternalLink({ label: 'GitHub', url: 'https://github.com/x' }), {}))
  it('nome e endereço obrigatórios', () => { assert.ok(validateExternalLink({ label: ' ', url: 'https://a.co' }).label); assert.ok(validateExternalLink({ label: 'x', url: '' }).url) })
  it('só http(s)', () => { assert.ok(validateExternalLink({ label: 'x', url: 'javascript:alert(1)' }).url); assert.ok(validateExternalLink({ label: 'x', url: 'github.com' }).url); assert.ok(validateExternalLink({ label: 'x', url: 'ftp://a.co' }).url) })
  it('sem duplicados e com limite', () => {
    assert.ok(validateExternalLink({ label: 'x', url: 'https://a.co' }, [{ label: 'a', url: 'https://a.co' }]).url)
    assert.ok(validateExternalLink({ label: 'x', url: 'https://novo.co' }, Array.from({ length: MAX_EXTERNAL_LINKS }, (_, i) => ({ label: 'l', url: `https://a${i}.co` }))).label)
  })
})

const project = (over) => ({ id: Math.random().toString(), name: 'P', type: 'development', status: 'active', dueDate: null, links: [], ...over })
const task = (over) => ({ id: Math.random().toString(), title: 'T', status: 'todo', projectId: null, ...over })

describe('contextos reorganizam sem duplicar dados', () => {
  it('quatro contextos com blocos válidos', () => {
    assert.deepEqual(Object.keys(CONTEXTS), ['today', 'development', 'editing', 'commercial'])
    for (const c of Object.values(CONTEXTS)) assert.ok(c.primary.every((b) => BLOCK_IDS.includes(b)))
  })
  it('layout: destaque na ordem do contexto; demais recolhidos; nada se perde e nada se repete', () => {
    for (const id of Object.keys(CONTEXTS)) {
      const { primary, secondary } = layoutFor(id, BLOCK_IDS)
      assert.deepEqual([...primary, ...secondary].sort(), [...BLOCK_IDS].sort())
      assert.equal(new Set([...primary, ...secondary]).size, BLOCK_IDS.length)
    }
    assert.deepEqual(layoutFor('commercial', BLOCK_IDS).primary.slice(0, 3), ['proposals', 'finance', 'clients'])
    assert.equal(layoutFor('editing', BLOCK_IDS).primary[0], 'video')
  })
  it('blocos ocultados somem de ambas as listas', () => {
    const { primary, secondary } = layoutFor('today', BLOCK_IDS, ['tasks', 'finance'])
    assert.ok(![...primary, ...secondary].some((b) => ['tasks', 'finance'].includes(b)))
  })
  it('tarefas filtradas pelo tipo de projeto; os mesmos objetos, sem cópia', () => {
    const projectsById = { d: project({ id: 'd', type: 'development' }), e: project({ id: 'e', type: 'editing' }) }
    const tasks = [task({ id: '1', projectId: 'd' }), task({ id: '2', projectId: 'e' }), task({ id: '3' }), task({ id: '4', projectId: 'd', status: 'done' })]
    assert.deepEqual(contextTasks('development', tasks, projectsById).map((t) => t.id), ['1'])
    assert.deepEqual(contextTasks('editing', tasks, projectsById).map((t) => t.id), ['2'])
    assert.deepEqual(contextTasks('today', tasks, projectsById).map((t) => t.id), ['1', '2', '3'])
    assert.equal(contextTasks('development', tasks, projectsById)[0], tasks[0])
  })
  it('links de repositório', () => {
    assert.equal(isRepoLink('https://github.com/a/b'), true); assert.equal(isRepoLink('https://www.gitlab.com/x'), true); assert.equal(isRepoLink('https://exemplo.com'), false); assert.equal(isRepoLink('lixo'), false)
    assert.deepEqual(repoLinks(project({ links: ['https://github.com/a/b', 'https://figma.com/x'] })), ['https://github.com/a/b'])
  })
  it('fila de vídeos: só projetos de edição abertos, por fase e prazo', () => {
    const d = (n) => new Date(2026, 9, n)
    const q = videoQueue([
      project({ id: 'a', type: 'editing', status: 'active', dueDate: d(20) }), project({ id: 'b', type: 'editing', status: 'planning', dueDate: d(10) }),
      project({ id: 'c', type: 'editing', status: 'review' }), project({ id: 'd', type: 'editing', status: 'waiting_client' }),
      project({ id: 'x', type: 'development', status: 'active' }), project({ id: 'y', type: 'editing', status: 'completed' }),
    ])
    assert.deepEqual(q.map((p) => p.projects.map((x) => x.id)), [['b', 'a'], ['c'], ['d']])
  })
  it('ações rápidas: as do contexto primeiro, ordem original no resto, sem perder nenhuma', () => {
    const actions = ['tarefa', 'cliente', 'projeto', 'evento', 'proposta', 'receita', 'despesa', 'tempo', 'nota', 'registro'].map((id) => ({ id }))
    const out = orderQuickActions(actions, 'commercial').map((a) => a.id)
    assert.deepEqual(out.slice(0, 4), ['proposta', 'cliente', 'receita', 'evento'])
    assert.deepEqual([...out].sort(), actions.map((a) => a.id).sort())
    assert.deepEqual(out.slice(4), ['tarefa', 'projeto', 'despesa', 'tempo', 'nota', 'registro'])
  })
})
