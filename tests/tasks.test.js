// Testes da lógica pura de tarefas (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dateToInput, filterTasks, inputToDate, parseTags, sortTasks, validateTask } from '../src/utils/tasks.js'

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(12, 0, 0, 0); return d }
const mk = (over) => ({ id: Math.random().toString(), title: 'T', description: '', status: 'todo', priority: 'medium', due: null, category: '', tags: [], ...over })

describe('filterTasks', () => {
  const tasks = [
    mk({ id: 'hoje', due: day(0) }),
    mk({ id: 'amanha', due: day(1), priority: 'high' }),
    mk({ id: 'atrasada', due: day(-2) }),
    mk({ id: 'feita', status: 'done', due: day(-1) }),
    mk({ id: 'busca', title: 'Editar vídeo', category: 'Vídeo', tags: ['cliente-a'] }),
  ]
  const ids = (f) => filterTasks(tasks, f).map((t) => t.id).sort()
  it('abertas exclui concluídas', () => assert.deepEqual(ids({ view: 'open' }), ['amanha', 'atrasada', 'busca', 'hoje']))
  it('hoje', () => assert.deepEqual(ids({ view: 'today' }), ['hoje']))
  it('próximas', () => assert.deepEqual(ids({ view: 'upcoming' }), ['amanha']))
  it('atrasadas ignora concluídas', () => assert.deepEqual(ids({ view: 'overdue' }), ['atrasada']))
  it('concluídas', () => assert.deepEqual(ids({ view: 'done' }), ['feita']))
  it('prioridade', () => assert.deepEqual(ids({ view: 'all', priority: 'high' }), ['amanha']))
  it('busca em título, categoria e tags, sem diferenciar maiúsculas', () => {
    assert.deepEqual(ids({ view: 'all', search: 'VÍDEO' }), ['busca'])
    assert.deepEqual(ids({ view: 'all', search: 'cliente-a' }), ['busca'])
  })
})

describe('sortTasks', () => {
  it('prazo mais próximo primeiro, sem prazo por último', () => {
    const out = sortTasks([mk({ id: 'c' }), mk({ id: 'b', due: day(3) }), mk({ id: 'a', due: day(1) })])
    assert.deepEqual(out.map((t) => t.id), ['a', 'b', 'c'])
  })
})

describe('validateTask', () => {
  const ok = { title: 'x', description: '', status: 'todo', priority: 'medium', due: '', category: '', tags: '' }
  it('aceita tarefa mínima', () => assert.deepEqual(validateTask(ok), {}))
  it('exige título', () => assert.ok(validateTask({ ...ok, title: '  ' }).title))
  it('limita título a 200', () => assert.ok(validateTask({ ...ok, title: 'a'.repeat(201) }).title))
  it('rejeita data inexistente', () => assert.ok(validateTask({ ...ok, due: '2026-02-31' }).due))
  it('limita tags', () => assert.ok(validateTask({ ...ok, tags: Array.from({ length: 21 }, (_, i) => `t${i}`).join(',') }).tags))
})

describe('datas e tags', () => {
  it('ida e volta de data no fuso local', () => assert.equal(dateToInput(inputToDate('2026-10-09')), '2026-10-09'))
  it('parseTags remove vazias e duplicadas', () => assert.deepEqual(parseTags('a, b,, A , c'), ['a', 'b', 'c']))
})
