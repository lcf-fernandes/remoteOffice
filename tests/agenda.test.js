// Testes da lógica de eventos e agenda (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAgendaItems, dayKey, filterAgenda, groupByDay, itemsByDay, monthWeeks, whenLabel } from '../src/utils/agenda.js'
import { dateTimeToInput, inputToDateTime, parseEventInput, validateEvent } from '../src/utils/events.js'

const at = (offset, h = 0, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d }
const ev = (over) => ({ id: Math.random().toString(), title: 'E', type: 'meeting', allDay: false, start: at(0, 10), end: null, description: '', projectId: null, reminderMinutes: null, ...over })
const task = (over) => ({ id: Math.random().toString(), title: 'T', status: 'todo', due: at(1), ...over })
const proj = (over) => ({ id: Math.random().toString(), name: 'P', status: 'active', dueDate: at(2), ...over })

describe('buildAgendaItems', () => {
  const items = buildAgendaItems({
    events: [ev({ id: 'e1', start: at(1, 15) })],
    tasks: [task({ id: 't1' }), task({ id: 't2', status: 'done' }), task({ id: 't3', due: null })],
    projects: [proj({ id: 'p1' }), proj({ id: 'p2', status: 'completed' }), proj({ id: 'p3', status: 'archived' })],
  })
  it('só entram tarefas e projetos abertos com prazo', () => assert.deepEqual(items.map((i) => i.key), ['t:t1', 'e:e1', 'p:p1']))
  it('identifica a origem de cada item', () => assert.deepEqual(items.map((i) => i.kind), ['task', 'event', 'project']))
  it('prazos (dia inteiro) vêm antes dos eventos com horário no mesmo dia', () => assert.equal(items[0].allDay, true))
})

describe('filterAgenda', () => {
  const items = buildAgendaItems({
    events: [ev({ id: 'hoje', start: at(0, 9) }), ev({ id: 'passado', start: at(-3, 9) }), ev({ id: 'longe', start: at(40, 9) })],
    tasks: [task({ id: 'atrasada', due: at(-2) }), task({ id: 'semana', due: at(5) })],
    projects: [proj({ id: 'mes', dueDate: at(20) })],
  })
  const ids = (f) => filterAgenda(items, f).map((i) => i.ref.id).sort()
  it('hoje', () => assert.deepEqual(ids({ range: 'today' }), ['hoje']))
  it('7 dias', () => assert.deepEqual(ids({ range: 'week' }), ['hoje', 'semana']))
  it('30 dias', () => assert.deepEqual(ids({ range: 'month' }), ['hoje', 'mes', 'semana']))
  it('vencidos: só prazos de tarefas/projetos, nunca eventos passados', () => assert.deepEqual(ids({ range: 'overdue' }), ['atrasada']))
  it('por origem', () => assert.deepEqual(ids({ range: 'month', source: 'task' }), ['semana']))
})

describe('agrupamento e calendário', () => {
  it('agrupa por dia mantendo a ordem', () => {
    const items = buildAgendaItems({ events: [ev({ start: at(0, 9) }), ev({ start: at(0, 14) }), ev({ start: at(1, 9) })] })
    const g = groupByDay(items)
    assert.equal(g.length, 2); assert.equal(g[0].items.length, 2)
  })
  it('itemsByDay usa a chave local do dia', () => {
    const items = buildAgendaItems({ events: [ev({ start: at(0, 23, 30) })] })
    assert.equal(itemsByDay(items)[dayKey(at(0))].length, 1)
  })
  it('monthWeeks cobre o mês em semanas completas começando no domingo', () => {
    const weeks = monthWeeks(new Date(2026, 9, 1))
    assert.ok(weeks.every((w) => w.length === 7 && w[0].getDay() === 0))
    const flat = weeks.flat()
    assert.ok(flat.some((d) => d.getMonth() === 9 && d.getDate() === 1) && flat.some((d) => d.getMonth() === 9 && d.getDate() === 31))
  })
  it('rótulos de horário', () => {
    assert.equal(whenLabel({ allDay: true, kind: 'event' }), 'Dia inteiro')
    assert.equal(whenLabel({ allDay: true, kind: 'task' }), 'Prazo do dia')
    assert.match(whenLabel({ allDay: false, start: at(0, 9, 5), end: at(0, 10, 30) }), /09:05.10:30/)
  })
})

describe('datas locais e validação de evento', () => {
  it('ida e volta datetime-local', () => assert.equal(dateTimeToInput(inputToDateTime('2026-10-10T09:30')), '2026-10-10T09:30'))
  it('rejeita data/hora inexistente', () => { assert.equal(inputToDateTime('2026-02-31T10:00'), undefined); assert.equal(inputToDateTime('2026-10-10T25:00'), undefined) })
  it('dia inteiro usa só a data', () => assert.ok(parseEventInput('2026-10-10', true) instanceof Date))
  const ok = { title: 'Reunião', type: 'meeting', allDay: false, start: '2026-10-10T10:00', end: '', description: '', projectId: '', reminder: '' }
  it('evento mínimo', () => assert.deepEqual(validateEvent(ok), {}))
  it('exige título e início', () => { assert.ok(validateEvent({ ...ok, title: ' ' }).title); assert.ok(validateEvent({ ...ok, start: '' }).start) })
  it('fim não pode ser antes do início', () => assert.ok(validateEvent({ ...ok, end: '2026-10-10T09:00' }).end))
  it('dia inteiro ignora o fim', () => assert.deepEqual(validateEvent({ ...ok, allDay: true, start: '2026-10-10', end: 'lixo' }), {}))
  it('lembrete só aceita valores conhecidos', () => { assert.deepEqual(validateEvent({ ...ok, reminder: '30' }), {}); assert.ok(validateEvent({ ...ok, reminder: '7' }).reminder) })
})
