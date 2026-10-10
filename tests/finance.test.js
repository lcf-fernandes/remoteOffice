// Testes da lógica financeira (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  effectiveStatus, filterTransactions, inPeriod, overdueTransactions, referenceDate, sortTransactions, summarize, validateTransaction,
} from '../src/utils/finance.js'

const NOW = new Date(2026, 9, 15, 12) // 15/10/2026
const d = (y, m, day) => new Date(y, m - 1, day)
let n = 0
const tx = (over) => ({ id: `t${n++}`, description: 'x', type: 'income', amount: 100, currency: 'BRL', status: 'pending', dueDate: d(2026, 10, 20), paidDate: null, category: '', notes: '', ...over })

describe('status vencido (derivado)', () => {
  it('pendente com vencimento antes de hoje = vencida', () => assert.equal(effectiveStatus(tx({ dueDate: d(2026, 10, 14) }), NOW), 'overdue'))
  it('no dia do vencimento ainda está no prazo', () => assert.equal(effectiveStatus(tx({ dueDate: d(2026, 10, 15) }), NOW), 'pending'))
  it('prevista nunca vence', () => assert.equal(effectiveStatus(tx({ status: 'planned', dueDate: d(2026, 1, 1) }), NOW), 'planned'))
  it('paga e cancelada nunca vencem', () => {
    assert.equal(effectiveStatus(tx({ status: 'paid', dueDate: d(2026, 1, 1), paidDate: d(2026, 1, 2) }), NOW), 'paid')
    assert.equal(effectiveStatus(tx({ status: 'cancelled', dueDate: d(2026, 1, 1) }), NOW), 'cancelled')
  })
  it('overdueTransactions lista só as vencidas', () => assert.equal(overdueTransactions([tx({ dueDate: d(2026, 10, 1) }), tx(), tx({ status: 'planned', dueDate: d(2026, 1, 1) })], NOW).length, 1))
})

describe('summarize (por moeda, sem misturar)', () => {
  const list = [
    tx({ amount: 1000, status: 'paid', paidDate: d(2026, 10, 5) }),
    tx({ amount: 500 }), // pendente no prazo
    tx({ amount: 300, dueDate: d(2026, 10, 1) }), // vencida
    tx({ amount: 700, status: 'planned' }),
    tx({ amount: 200, type: 'expense', status: 'paid', paidDate: d(2026, 10, 6) }),
    tx({ amount: 50, type: 'expense' }),
    tx({ amount: 900, status: 'cancelled' }),
    tx({ amount: 80, currency: 'USD', status: 'paid', paidDate: d(2026, 10, 7) }),
  ]
  const s = summarize(list, NOW)
  it('separa receitas por status', () => assert.deepEqual(s.BRL.income, { paid: 1000, pending: 500, overdue: 300, planned: 700 }))
  it('separa despesas por status', () => assert.deepEqual(s.BRL.expense, { paid: 200, pending: 50, overdue: 0, planned: 0 }))
  it('previsto e pendente não entram no saldo realizado', () => assert.equal(s.BRL.balance, 800))
  it('canceladas são ignoradas', () => assert.equal(Object.values(s.BRL.income).reduce((a, b) => a + b, 0), 2500))
  it('cada moeda tem seu próprio total (nada de soma única)', () => { assert.deepEqual(Object.keys(s).sort(), ['BRL', 'USD']); assert.equal(s.USD.income.paid, 80); assert.equal(s.USD.balance, 80) })
  it('sem ruído de ponto flutuante', () => assert.equal(summarize([tx({ amount: 0.1, status: 'paid', paidDate: NOW }), tx({ amount: 0.2, status: 'paid', paidDate: NOW })], NOW).BRL.income.paid, 0.3))
  it('PYG sem casas decimais', () => assert.equal(summarize([tx({ amount: 15000.4, currency: 'PYG', status: 'paid', paidDate: NOW })], NOW).PYG.income.paid, 15000))
})

describe('períodos', () => {
  it('data de referência: pago = pagamento; demais = vencimento', () => {
    assert.equal(referenceDate(tx({ status: 'paid', paidDate: d(2026, 9, 30), dueDate: d(2026, 10, 10) })).getMonth(), 8)
    assert.equal(referenceDate(tx({ dueDate: d(2026, 10, 10) })).getMonth(), 9)
  })
  it('este mês / mês passado', () => {
    assert.equal(inPeriod(d(2026, 10, 31), 'month', NOW), true); assert.equal(inPeriod(d(2026, 11, 1), 'month', NOW), false)
    assert.equal(inPeriod(d(2026, 9, 30), 'last_month', NOW), true); assert.equal(inPeriod(d(2026, 10, 1), 'last_month', NOW), false)
  })
  it('próximos 30 dias inclui hoje e exclui o dia 31', () => {
    assert.equal(inPeriod(d(2026, 10, 15), 'next_30', NOW), true); assert.equal(inPeriod(d(2026, 11, 13), 'next_30', NOW), true); assert.equal(inPeriod(d(2026, 11, 14), 'next_30', NOW), false); assert.equal(inPeriod(d(2026, 10, 14), 'next_30', NOW), false)
  })
  it('este ano e tudo', () => { assert.equal(inPeriod(d(2026, 1, 1), 'year', NOW), true); assert.equal(inPeriod(d(2025, 12, 31), 'year', NOW), false); assert.equal(inPeriod(d(1999, 1, 1), 'all', NOW), true) })
  it('janeiro: mês passado é dezembro do ano anterior', () => assert.equal(inPeriod(d(2025, 12, 20), 'last_month', new Date(2026, 0, 10)), true))
})

describe('filtros e ordenação', () => {
  const list = [
    tx({ id: 'a', description: 'Site', category: 'Projeto' }),
    tx({ id: 'b', type: 'expense', description: 'Hospedagem', currency: 'USD', dueDate: d(2026, 10, 3) }),
    tx({ id: 'c', status: 'paid', paidDate: d(2026, 9, 10), dueDate: d(2026, 9, 5) }),
    tx({ id: 'd', status: 'planned', dueDate: d(2026, 10, 25) }),
  ]
  const ids = (f) => filterTransactions(list, { period: 'all', ...f }, NOW).map((t) => t.id).sort()
  it('por tipo, moeda, busca', () => { assert.deepEqual(ids({ type: 'expense' }), ['b']); assert.deepEqual(ids({ currency: 'USD' }), ['b']); assert.deepEqual(ids({ search: 'projeto' }), ['a']) })
  it('status "vencida" usa o status derivado', () => assert.deepEqual(ids({ status: 'overdue' }), ['b']))
  it('período usa pagamento para pagos (c é de setembro)', () => assert.deepEqual(filterTransactions(list, { period: 'month' }, NOW).map((t) => t.id).sort(), ['a', 'b', 'd']))
  it('abertas primeiro por vencimento, depois pagas', () => assert.deepEqual(sortTransactions(list).map((t) => t.id), ['b', 'a', 'd', 'c']))
})

describe('validateTransaction', () => {
  const ok = { description: 'Parcela', type: 'income', amount: '1500.5', currency: 'BRL', status: 'pending', dueDate: '2026-10-20', paidDate: '', category: '', notes: '' }
  it('mínimo válido', () => assert.deepEqual(validateTransaction(ok), {}))
  it('exige descrição, valor > 0 e vencimento', () => {
    assert.ok(validateTransaction({ ...ok, description: ' ' }).description); assert.ok(validateTransaction({ ...ok, amount: '0' }).amount)
    assert.ok(validateTransaction({ ...ok, amount: '' }).amount); assert.ok(validateTransaction({ ...ok, amount: 'abc' }).amount); assert.ok(validateTransaction({ ...ok, dueDate: '' }).dueDate)
  })
  it('pago exige data do pagamento; não pago ignora', () => {
    assert.ok(validateTransaction({ ...ok, status: 'paid' }).paidDate)
    assert.deepEqual(validateTransaction({ ...ok, status: 'paid', paidDate: '2026-10-10' }), {})
    assert.deepEqual(validateTransaction({ ...ok, status: 'pending', paidDate: 'lixo' }), {})
  })
  it('moeda, tipo e data inexistente', () => {
    assert.ok(validateTransaction({ ...ok, currency: 'XYZ' }).currency); assert.ok(validateTransaction({ ...ok, type: 'x' }).type); assert.ok(validateTransaction({ ...ok, dueDate: '2026-02-31' }).dueDate)
  })
})
