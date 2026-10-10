// Testes da lógica de notas e registro de trabalho (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allTags, filterNotes, filterWorkLog, noteHeading, snippet, sortNotes, sortWorkLog, validateNote, validateWorkLog } from '../src/utils/notes.js'

const d = (m, day, h = 12) => new Date(2026, m - 1, day, h)
const note = (over = {}) => ({ id: Math.random().toString(), title: '', content: 'texto', tags: [], clientId: null, projectId: null, taskId: null, createdAt: d(10, 10), updatedAt: d(10, 10), ...over })
const entry = (over = {}) => ({ id: Math.random().toString(), date: d(10, 10), done: 'x', blockers: '', nextStep: '', clientId: null, projectId: null, taskId: null, createdAt: d(10, 10), ...over })

describe('validateNote', () => {
  const ok = { title: '', content: 'Ideia', tags: '' }
  it('mínimo: só o conteúdo', () => assert.deepEqual(validateNote(ok), {}))
  it('conteúdo obrigatório (espaços não contam)', () => assert.ok(validateNote({ ...ok, content: '   \n ' }).content))
  it('limites de título, conteúdo e tags', () => {
    assert.ok(validateNote({ ...ok, title: 'a'.repeat(161) }).title)
    assert.ok(validateNote({ ...ok, content: 'a'.repeat(10001) }).content)
    assert.ok(validateNote({ ...ok, tags: Array.from({ length: 21 }, (_, i) => `t${i}`).join(',') }).tags)
    assert.ok(validateNote({ ...ok, tags: 'a'.repeat(31) }).tags)
  })
})

describe('validateWorkLog', () => {
  const ok = { date: '2026-10-10', done: 'Corte', blockers: '', nextStep: '' }
  it('um campo basta', () => { assert.deepEqual(validateWorkLog(ok), {}); assert.deepEqual(validateWorkLog({ date: '2026-10-10', done: '', blockers: 'sem acesso', nextStep: '' }), {}) })
  it('os três vazios são rejeitados', () => assert.ok(validateWorkLog({ ...ok, done: ' ' }).done))
  it('data obrigatória e válida', () => { assert.ok(validateWorkLog({ ...ok, date: '' }).date); assert.ok(validateWorkLog({ ...ok, date: '2026-02-31' }).date) })
  it('limite por campo', () => assert.ok(validateWorkLog({ ...ok, nextStep: 'a'.repeat(5001) }).nextStep))
})

describe('títulos e trechos', () => {
  it('sem título usa a primeira linha', () => assert.equal(noteHeading(note({ content: 'Primeira linha\nSegunda' })), 'Primeira linha'))
  it('título tem prioridade', () => assert.equal(noteHeading(note({ title: 'Meu título', content: 'abc' })), 'Meu título'))
  it('trecho limitado', () => { assert.equal(snippet('a b   c'), 'a b c'); assert.ok(snippet('x'.repeat(200), 50).endsWith('…')) })
})

describe('busca e filtros de notas', () => {
  const list = [
    note({ id: 'a', title: 'Reunião', content: 'Alinhar escopo', tags: ['cliente-a'], createdAt: d(10, 5) }),
    note({ id: 'b', content: 'Ideia de vídeo', tags: ['ideia'], createdAt: d(10, 12) }),
    note({ id: 'c', content: 'Comprar microfone', tags: ['ideia', 'compras'], createdAt: d(9, 20) }),
  ]
  const ids = (f) => filterNotes(list, f).map((n) => n.id).sort()
  it('texto no título, conteúdo e tags (sem diferenciar maiúsculas)', () => { assert.deepEqual(ids({ search: 'REUNIÃO' }), ['a']); assert.deepEqual(ids({ search: 'microfone' }), ['c']); assert.deepEqual(ids({ search: 'cliente-a' }), ['a']) })
  it('por tag', () => assert.deepEqual(ids({ tag: 'ideia' }), ['b', 'c']))
  it('por intervalo de datas (inclusivo)', () => {
    assert.deepEqual(ids({ from: '2026-10-05', to: '2026-10-12' }), ['a', 'b'])
    assert.deepEqual(ids({ from: '2026-10-06' }), ['b'])
    assert.deepEqual(ids({ to: '2026-09-30' }), ['c'])
  })
  it('combina filtros', () => assert.deepEqual(ids({ tag: 'ideia', from: '2026-10-01' }), ['b']))
  it('lista as tags existentes sem repetir', () => assert.deepEqual(allTags(list), ['cliente-a', 'compras', 'ideia']))
  it('mais recentes (atualizadas) primeiro', () => assert.deepEqual(sortNotes([note({ id: 'x', updatedAt: d(10, 1) }), note({ id: 'y', updatedAt: d(10, 9) })]).map((n) => n.id), ['y', 'x']))
})

describe('registro de trabalho: busca, projeto e datas', () => {
  const list = [
    entry({ id: 'a', done: 'Montei o layout', projectId: 'p1', date: d(10, 8) }),
    entry({ id: 'b', blockers: 'Aguardando acesso ao servidor', projectId: 'p2', date: d(10, 9) }),
    entry({ id: 'c', nextStep: 'Revisar legendas', projectId: 'p1', date: d(10, 9), createdAt: d(10, 11, 18) }),
  ]
  const ids = (f) => filterWorkLog(list, f).map((e) => e.id).sort()
  it('busca nos três campos', () => { assert.deepEqual(ids({ search: 'layout' }), ['a']); assert.deepEqual(ids({ search: 'servidor' }), ['b']); assert.deepEqual(ids({ search: 'legendas' }), ['c']) })
  it('por projeto e por data', () => { assert.deepEqual(ids({ projectId: 'p1' }), ['a', 'c']); assert.deepEqual(ids({ from: '2026-10-09', to: '2026-10-09' }), ['b', 'c']) })
  it('ordena por data e, no empate, pelo mais recente criado', () => assert.deepEqual(sortWorkLog(list).map((e) => e.id), ['c', 'b', 'a']))
})
