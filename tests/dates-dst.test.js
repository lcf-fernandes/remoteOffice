// Datas em dias com mudança de horário de verão (dias de 23 h e de 25 h) e em qualquer fuso.
// Rodado em vários fusos por: npm run test:tz
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addDays, dayKey, filterAgenda, buildAgendaItems, monthWeeks, startOfDay } from '../src/utils/agenda.js'
import { daysBetween } from '../src/utils/proposals.js'
import { inTimePeriod, durationSeconds, formatDuration, buildReport } from '../src/utils/time.js'
import { taskDueDate } from '../src/utils/templates.js'
import { dateToInput, inputToDate } from '../src/utils/tasks.js'
import { dateTimeToInput, inputToDateTime } from '../src/utils/events.js'
import { inPeriod } from '../src/utils/finance.js'

// Datas escolhidas em torno de mudanças de horário nos EUA (8/mar e 1/nov de 2026), na Europa (29/mar e 25/out)
// e no hemisfério sul (Nova Zelândia: 27/set e 5/abr). Em fusos sem horário de verão, valem como dias normais.
const AROUND = [[2026, 2, 7], [2026, 2, 8], [2026, 2, 28], [2026, 2, 29], [2026, 9, 24], [2026, 9, 25], [2026, 10, 1], [2026, 8, 26], [2026, 8, 27], [2026, 3, 4]]

describe('aritmética de dias não depende do horário de verão', () => {
  for (const [y, m, d] of AROUND) {
    it(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}: +1 dia é o dia seguinte à meia-noite; diferença = 1`, () => {
      const day = new Date(y, m, d)
      const next = addDays(day, 1)
      assert.equal(next.getHours(), 0, 'meia-noite local')
      assert.equal(next.getDate(), new Date(y, m, d + 1).getDate())
      assert.equal(daysBetween(day, next), 1)
      assert.equal(daysBetween(new Date(y, m, d, 23, 59), new Date(y, m, d + 1, 0, 1)), 1)
      assert.equal(daysBetween(new Date(y, m, d, 12), new Date(y, m, d, 12)), 0)
      assert.equal(startOfDay(new Date(y, m, d, 18, 30)).getHours(), 0)
    })
  }
  it('uma semana sempre tem 7 dias de calendário, mesmo atravessando a mudança', () => {
    for (const [y, m, d] of AROUND) assert.equal(daysBetween(new Date(y, m, d), addDays(new Date(y, m, d), 7)), 7)
  })
  it('meses de março, abril, outubro e novembro: semanas completas com datas consecutivas', () => {
    for (const month of [2, 3, 8, 9, 10]) {
      const flat = monthWeeks(new Date(2026, month, 1), 0).flat()
      assert.ok(monthWeeks(new Date(2026, month, 1), 1).every((w) => w.length === 7))
      flat.forEach((day, i) => { if (i > 0) assert.equal(daysBetween(flat[i - 1], day), 1, `${dayKey(day)} deveria vir 1 dia depois de ${dayKey(flat[i - 1])}`) })
      assert.ok(flat.every((day) => day.getHours() === 0), 'todas as células à meia-noite local')
    }
  })
  it('prazo de tarefa do modelo = início + N dias, à meia-noite local, atravessando a mudança', () => {
    for (const n of [1, 7, 30, 60, 200]) { const due = taskDueDate(new Date(2026, 2, 1), n); assert.equal(due.getHours(), 0); assert.equal(daysBetween(new Date(2026, 2, 1), due), n) }
  })
  it('campos de data/hora ida e volta (inclui dia de 23 h)', () => {
    assert.equal(dateToInput(inputToDate('2026-03-08')), '2026-03-08')
    assert.equal(dateTimeToInput(inputToDateTime('2026-03-08T12:30')), '2026-03-08T12:30')
    assert.equal(dateTimeToInput(inputToDateTime('2026-11-01T12:30')), '2026-11-01T12:30')
  })
})

describe('tempo e períodos', () => {
  it('duração vem dos instantes (UTC), não do relógio de parede: 2 h reais cruzando a mudança', () => {
    assert.equal(durationSeconds(new Date('2026-11-01T05:30:00Z'), new Date('2026-11-01T07:30:00Z')), 7200)
    assert.equal(durationSeconds(new Date('2026-03-08T06:30:00Z'), new Date('2026-03-08T08:30:00Z')), 7200)
    assert.equal(formatDuration(7200), '2h 00min')
  })
  it('um registro de 24 h exatas cruzando a mudança continua válido para o relatório', () => {
    const start = new Date('2026-03-07T12:00:00Z')
    const e = { id: 'e', start, end: new Date(start.getTime() + 86400000), durationSeconds: 86400, billable: false, taskId: null, projectId: null }
    assert.equal(buildReport([e], 'day')[0].seconds, 86400)
  })
  it('períodos de hoje e de 7 dias usam dias de calendário também nos dias de 23/25 h', () => {
    for (const [y, m, d] of AROUND) {
      const now = new Date(y, m, d, 15)
      assert.equal(inTimePeriod(new Date(y, m, d, 0, 5), 'today', now), true)
      assert.equal(inTimePeriod(new Date(y, m, d - 1, 23, 55), 'today', now), false)
      assert.equal(inTimePeriod(new Date(y, m, d - 6, 9), 'week', now), true)
      assert.equal(inTimePeriod(new Date(y, m, d - 7, 9), 'week', now), false)
    }
  })
  it('períodos financeiros: limite do mês e dos próximos 30 dias', () => {
    const now = new Date(2026, 9, 31, 22) // 31/10 à noite
    assert.equal(inPeriod(new Date(2026, 9, 1), 'month', now), true); assert.equal(inPeriod(new Date(2026, 10, 1), 'month', now), false)
    assert.equal(inPeriod(new Date(2026, 9, 31), 'next_30', now), true); assert.equal(inPeriod(new Date(2026, 10, 29), 'next_30', now), true); assert.equal(inPeriod(new Date(2026, 10, 30), 'next_30', now), false)
  })
  it('filtro de agenda "7 dias" e "hoje" atravessando a mudança', () => {
    const now = new Date(2026, 2, 7, 10)
    const ev = (id, date) => ({ id, title: id, type: 'meeting', allDay: true, start: date, end: null })
    const items = buildAgendaItems({ events: [ev('hoje', new Date(2026, 2, 7)), ev('d6', new Date(2026, 2, 13)), ev('d7', new Date(2026, 2, 14))] })
    assert.deepEqual(filterAgenda(items, { range: 'week', now }).map((i) => i.ref.id), ['hoje', 'd6'])
    assert.deepEqual(filterAgenda(items, { range: 'today', now }).map((i) => i.ref.id), ['hoje'])
  })
})
