// Testes da lógica pura de clientes (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterClients, nextActionIsLate, sortClients, validateClient, validateInteraction } from '../src/utils/clients.js'

const mk = (over) => ({ id: Math.random().toString(), name: 'Ana', company: '', email: '', phone: '', source: '', status: 'active', notes: '', nextAction: '', nextActionDate: null, ...over })
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d }

describe('filterClients', () => {
  const list = [mk({ id: 'a', name: 'Ana', status: 'active' }), mk({ id: 'l', name: 'Lia', status: 'lead' }), mk({ id: 'x', name: 'Xico', status: 'archived', company: 'Studio Zeta' }), mk({ id: 'i', name: 'Iara', status: 'inactive' })]
  const ids = (f) => filterClients(list, f).map((c) => c.id).sort()
  it('em andamento exclui arquivados', () => assert.deepEqual(ids({ view: 'current' }), ['a', 'i', 'l']))
  it('filtra por status', () => { assert.deepEqual(ids({ view: 'lead' }), ['l']); assert.deepEqual(ids({ view: 'archived' }), ['x']) })
  it('todos inclui arquivados', () => assert.equal(ids({ view: 'all' }).length, 4))
  it('busca por empresa sem diferenciar maiúsculas', () => assert.deepEqual(ids({ view: 'all', search: 'ZETA' }), ['x']))
})

describe('sortClients', () => {
  it('ordena por nome ignorando acentos e caixa', () => {
    assert.deepEqual(sortClients([mk({ name: 'zé' }), mk({ name: 'Ágata' }), mk({ name: 'bia' })]).map((c) => c.name), ['Ágata', 'bia', 'zé'])
  })
})

describe('nextActionIsLate', () => {
  it('atrasada só quando a data passou e o cliente não está arquivado', () => {
    assert.equal(nextActionIsLate(mk({ nextActionDate: day(-1) })), true)
    assert.equal(nextActionIsLate(mk({ nextActionDate: day(1) })), false)
    assert.equal(nextActionIsLate(mk({ nextActionDate: day(-1), status: 'archived' })), false)
  })
})

describe('validateClient', () => {
  const ok = { name: 'Ana', company: '', email: '', phone: '', source: '', status: 'lead', notes: '', nextAction: '', nextActionDate: '' }
  it('aceita mínimo', () => assert.deepEqual(validateClient(ok), {}))
  it('exige nome', () => assert.ok(validateClient({ ...ok, name: ' ' }).name))
  it('valida e-mail', () => { assert.ok(validateClient({ ...ok, email: 'abc' }).email); assert.deepEqual(validateClient({ ...ok, email: 'a@b.co' }), {}) })
  it('valida telefone', () => { assert.ok(validateClient({ ...ok, phone: 'abc' }).phone); assert.deepEqual(validateClient({ ...ok, phone: '+55 (11) 99999-0000' }), {}) })
  it('rejeita data inexistente', () => assert.ok(validateClient({ ...ok, nextActionDate: '2026-02-31' }).nextActionDate))
})

describe('validateInteraction', () => {
  it('exige data e resumo', () => {
    assert.ok(validateInteraction({ date: '', type: 'call', summary: 'x' }).date)
    assert.ok(validateInteraction({ date: '2026-10-09', type: 'call', summary: '  ' }).summary)
    assert.deepEqual(validateInteraction({ date: '2026-10-09', type: 'call', summary: 'ok' }), {})
  })
})
