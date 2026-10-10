// Testes da lógica de registro de tempo (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_ENTRY_SECONDS, buildReport, durationSeconds, entryProjectId, filterEntries, findOverlaps, formatClock, formatDuration, inTimePeriod, totals, validateEntry,
} from '../src/utils/time.js'

const NOW = new Date(2026, 9, 15, 15, 0)
const at = (m, d, h = 9, min = 0) => new Date(2026, m - 1, d, h, min)
let n = 0
const entry = (over = {}) => {
  const start = over.start ?? at(10, 15, 9)
  const end = over.end ?? at(10, 15, 10)
  return { id: `e${n++}`, description: '', taskId: null, projectId: null, start, end, durationSeconds: durationSeconds(start, end), billable: false, ...over, ...(over.start || over.end ? {} : {}) }
}

describe('formatação', () => {
  it('duração legível', () => {
    assert.equal(formatDuration(0), '0s'); assert.equal(formatDuration(45), '45s'); assert.equal(formatDuration(60), '1min')
    assert.equal(formatDuration(3600), '1h 00min'); assert.equal(formatDuration(5400), '1h 30min'); assert.equal(formatDuration(3 * 3600 + 5 * 60 + 40), '3h 05min')
  })
  it('relógio HH:MM:SS', () => { assert.equal(formatClock(0), '00:00:00'); assert.equal(formatClock(3725), '01:02:05'); assert.equal(formatClock(-5), '00:00:00') })
  it('duração a partir de timestamps (nunca de contador)', () => assert.equal(durationSeconds(at(10, 15, 9), at(10, 15, 10, 30)), 5400))
})

describe('validateEntry', () => {
  const ok = { description: '', start: '2026-10-15T09:00', end: '2026-10-15T10:00' }
  it('válido', () => assert.deepEqual(validateEntry(ok, { now: NOW }), {}))
  it('exige início e fim', () => { assert.ok(validateEntry({ ...ok, start: '' }, { now: NOW }).start); assert.ok(validateEntry({ ...ok, end: '' }, { now: NOW }).end) })
  it('fim depois do início', () => { assert.ok(validateEntry({ ...ok, end: '2026-10-15T09:00' }, { now: NOW }).end); assert.ok(validateEntry({ ...ok, end: '2026-10-15T08:00' }, { now: NOW }).end) })
  it('máximo de 24 h', () => {
    assert.deepEqual(validateEntry({ ...ok, start: '2026-10-14T10:00', end: '2026-10-15T10:00' }, { now: NOW }), {}) // exatamente 24 h
    assert.ok(validateEntry({ ...ok, start: '2026-10-14T09:00', end: '2026-10-15T10:00' }, { now: NOW }).end)
    assert.equal(MAX_ENTRY_SECONDS, 86400)
  })
  it('fim no futuro é rejeitado', () => assert.ok(validateEntry({ ...ok, end: '2026-10-15T18:00' }, { now: NOW }).end))
  it('data inválida e descrição longa', () => { assert.ok(validateEntry({ ...ok, start: '2026-02-31T10:00' }, { now: NOW }).start); assert.ok(validateEntry({ ...ok, description: 'x'.repeat(201) }, { now: NOW }).description) })
})

describe('sobreposição', () => {
  const list = [entry({ id: 'a', start: at(10, 15, 9), end: at(10, 15, 10) })]
  it('detecta intervalos que se cruzam', () => assert.equal(findOverlaps(list, at(10, 15, 9, 30), at(10, 15, 10, 30)).length, 1))
  it('encostar não é sobrepor', () => assert.equal(findOverlaps(list, at(10, 15, 10), at(10, 15, 11)).length, 0))
  it('ignora o próprio registro ao editar', () => assert.equal(findOverlaps(list, at(10, 15, 9, 30), at(10, 15, 9, 45), 'a').length, 0))
})

describe('períodos', () => {
  it('hoje / 7 dias / mês / mês passado', () => {
    assert.equal(inTimePeriod(at(10, 15, 0, 5), 'today', NOW), true); assert.equal(inTimePeriod(at(10, 14), 'today', NOW), false)
    assert.equal(inTimePeriod(at(10, 9), 'week', NOW), true); assert.equal(inTimePeriod(at(10, 8), 'week', NOW), false)
    assert.equal(inTimePeriod(at(10, 1), 'month', NOW), true); assert.equal(inTimePeriod(at(9, 30), 'month', NOW), false)
    assert.equal(inTimePeriod(at(9, 30), 'last_month', NOW), true); assert.equal(inTimePeriod(at(10, 1), 'last_month', NOW), false)
  })
  it('registro que cruza a meia-noite conta no dia em que começou', () => {
    const e = entry({ start: at(10, 14, 23, 30), end: at(10, 15, 1, 0) })
    assert.equal(filterEntries([e], 'today', NOW).length, 0)
    assert.equal(filterEntries([e], 'week', NOW).length, 1)
  })
})

describe('relatórios coerentes', () => {
  const tasksById = { t1: { id: 't1', title: 'Editar vídeo', projectId: 'p1', category: 'Vídeo' }, t2: { id: 't2', title: 'Site', projectId: null, category: '' } }
  const projectsById = { p1: { id: 'p1', name: 'Institucional' } }
  const list = [
    entry({ taskId: 't1', projectId: 'p1', start: at(10, 15, 9), end: at(10, 15, 10) }), // 3600
    entry({ taskId: 't1', projectId: 'p1', start: at(10, 14, 9), end: at(10, 14, 9, 30), billable: true }), // 1800 faturável
    entry({ taskId: 't2', start: at(10, 14, 14), end: at(10, 14, 15) }), // 3600
    entry({ projectId: 'p1', start: at(10, 13, 9), end: at(10, 13, 9, 45) }), // 2700 só projeto
    entry({ taskId: 'apagada', projectId: 'pX', start: at(10, 13, 11), end: at(10, 13, 11, 15) }), // 900 tarefa excluída
  ]
  const total = totals(list)
  const ctx = { tasksById, projectsById }
  it('total e faturável são calculados separadamente', () => { assert.equal(total.seconds, 12600); assert.equal(total.billableSeconds, 1800); assert.equal(total.count, 5) })
  for (const kind of ['day', 'task', 'project', 'category']) {
    it(`relatório por ${kind}: a soma das linhas = total do período`, () => {
      const rows = buildReport(list, kind, ctx)
      assert.equal(rows.reduce((a, r) => a + r.seconds, 0), total.seconds)
      assert.equal(rows.reduce((a, r) => a + r.count, 0), total.count)
      assert.equal(rows.reduce((a, r) => a + r.billableSeconds, 0), total.billableSeconds)
    })
  }
  it('por dia: mais recente primeiro', () => assert.deepEqual(buildReport(list, 'day', ctx).map((r) => r.seconds), [3600, 5400, 3600]))
  it('por tarefa: rótulos, tarefa excluída e sem tarefa', () => {
    const labels = buildReport(list, 'task', ctx).map((r) => r.label)
    assert.ok(labels.includes('Editar vídeo') && labels.includes('(tarefa excluída)') && labels.includes('Sem tarefa'))
  })
  it('por projeto: usa o projeto atual da tarefa', () => {
    assert.equal(entryProjectId(list[2], tasksById), null) // t2 sem projeto
    assert.equal(entryProjectId(list[0], tasksById), 'p1')
    assert.equal(entryProjectId(list[3], tasksById), 'p1') // só projeto
    const rows = buildReport(list, 'project', ctx)
    assert.equal(rows.find((r) => r.label === 'Institucional').seconds, 3600 + 1800 + 2700)
  })
  it('por categoria: tarefa sem categoria e sem tarefa caem em "Sem categoria"', () => assert.equal(buildReport(list, 'category', ctx).find((r) => r.label === 'Sem categoria').seconds, 3600 + 2700 + 900))
  it('relatório vazio', () => assert.deepEqual(buildReport([], 'day', ctx), []))
})
