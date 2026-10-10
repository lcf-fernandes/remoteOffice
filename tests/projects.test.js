// Testes da lógica pura de projetos (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  attentionReason, filterProjects, isValidUrl, kanbanColumns, parseLinks, progressByProject, projectProgress, sortProjects, validateJournal, validateMilestone, validateProject,
} from '../src/utils/projects.js'

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d }
const mk = (over) => ({ id: Math.random().toString(), name: 'P', description: '', clientId: null, type: 'development', status: 'active', priority: 'medium', startDate: null, dueDate: null, links: [], ...over })
const t = (status, projectId = 'p1') => ({ status, projectId })

describe('projectProgress (tarefas concluídas ÷ não canceladas)', () => {
  it('ignora canceladas no total', () => assert.deepEqual(projectProgress([t('done'), t('todo'), t('cancelled')]), { done: 1, total: 2, percent: 50 }))
  it('sem tarefas: percent nulo', () => assert.deepEqual(projectProgress([]), { done: 0, total: 0, percent: null }))
  it('só canceladas: percent nulo', () => assert.equal(projectProgress([t('cancelled')]).percent, null))
  it('tudo concluído = 100%', () => assert.equal(projectProgress([t('done'), t('done')]).percent, 100))
  it('arredonda', () => assert.equal(projectProgress([t('done'), t('todo'), t('todo')]).percent, 33))
})

describe('progressByProject', () => {
  it('agrupa por projeto e ignora tarefas sem projeto', () => {
    const out = progressByProject([t('done', 'a'), t('todo', 'a'), t('done', 'b'), { status: 'done', projectId: null }])
    assert.equal(out.a.percent, 50); assert.equal(out.b.percent, 100); assert.equal(Object.keys(out).length, 2)
  })
})

describe('filterProjects / kanban', () => {
  const list = [mk({ id: 'a', status: 'planning' }), mk({ id: 'b', status: 'review' }), mk({ id: 'c', status: 'completed' }), mk({ id: 'd', status: 'archived', name: 'Velho' })]
  const ids = (f) => filterProjects(list, f).map((p) => p.id).sort()
  it('em andamento', () => assert.deepEqual(ids({ view: 'open' }), ['a', 'b']))
  it('concluídos e arquivados', () => { assert.deepEqual(ids({ view: 'completed' }), ['c']); assert.deepEqual(ids({ view: 'archived' }), ['d']) })
  it('todos + busca', () => { assert.equal(ids({ view: 'all' }).length, 4); assert.deepEqual(ids({ view: 'all', search: 'velho' }), ['d']) })
  it('filtro por tipo', () => assert.deepEqual(filterProjects([mk({ id: 'x', type: 'editing' }), mk({ id: 'y' })], { view: 'all', type: 'editing' }).map((p) => p.id), ['x']))
  it('colunas do Kanban cobrem exatamente os status da visão', () => {
    assert.deepEqual(kanbanColumns('open'), ['planning', 'active', 'waiting_client', 'review'])
    assert.deepEqual(kanbanColumns('archived'), ['archived'])
    assert.equal(kanbanColumns('all').length, 6)
  })
})

describe('attentionReason', () => {
  it('vencido', () => assert.match(attentionReason(mk({ dueDate: day(-2) })), /vencido há 2 dias/))
  it('aguardando cliente', () => assert.match(attentionReason(mk({ status: 'waiting_client' })), /cliente/))
  it('entrega em até 7 dias', () => assert.match(attentionReason(mk({ dueDate: day(5) })), /7 dias/))
  it('nada para concluídos/arquivados ou prazo distante', () => {
    assert.equal(attentionReason(mk({ status: 'completed', dueDate: day(-5) })), null)
    assert.equal(attentionReason(mk({ dueDate: day(30) })), null)
  })
})

describe('sortProjects', () => {
  it('prazo mais próximo primeiro, sem prazo por último', () => {
    assert.deepEqual(sortProjects([mk({ id: 'c' }), mk({ id: 'b', dueDate: day(3) }), mk({ id: 'a', dueDate: day(1) })]).map((p) => p.id), ['a', 'b', 'c'])
  })
})

describe('validações', () => {
  const ok = { name: 'Site', description: '', clientId: '', type: 'development', status: 'planning', priority: 'medium', startDate: '', dueDate: '', links: '' }
  it('projeto mínimo', () => assert.deepEqual(validateProject(ok), {}))
  it('exige nome', () => assert.ok(validateProject({ ...ok, name: ' ' }).name))
  it('prazo antes do início', () => assert.ok(validateProject({ ...ok, startDate: '2026-10-10', dueDate: '2026-10-01' }).dueDate))
  it('links: só http(s), máx. 10', () => {
    assert.ok(validateProject({ ...ok, links: 'javascript:alert(1)' }).links)
    assert.ok(validateProject({ ...ok, links: 'exemplo.com' }).links)
    assert.deepEqual(validateProject({ ...ok, links: 'https://a.co\nhttp://b.co' }), {})
    assert.ok(validateProject({ ...ok, links: Array.from({ length: 11 }, (_, i) => `https://a${i}.co`).join('\n') }).links)
  })
  it('helpers de link', () => { assert.equal(isValidUrl('https://x.co/a'), true); assert.equal(isValidUrl('ftp://x.co'), false); assert.deepEqual(parseLinks('https://a.co\n\nhttps://a.co'), ['https://a.co']) })
  it('marco e diário', () => {
    assert.ok(validateMilestone({ title: ' ', date: '' }).title)
    assert.deepEqual(validateMilestone({ title: 'Entrega', date: '' }), {})
    assert.ok(validateJournal({ date: '', text: 'x' }).date)
    assert.ok(validateJournal({ date: '2026-10-10', text: '  ' }).text)
  })
})
