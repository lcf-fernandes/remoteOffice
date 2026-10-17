// Testes da lógica de propostas (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FOLLOW_UP_DAY_OPTIONS, filterProposals, followUpReason, followUpRuleText, parseAmount, pipelineTotals, roundMoney, sortProposals, validateProposal,
} from '../src/utils/proposals.js'
import { formatMoney } from '../src/utils/format.js'

const day = (n, h = 12) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d }
const mk = (over) => ({ id: Math.random().toString(), title: 'Proposta', summary: '', clientId: 'c1', amount: 1000, currency: 'BRL', sentDate: null, validUntil: null, status: 'sent', nextAction: '', nextActionDate: null, projectId: null, lastActivityAt: day(0), createdAt: day(-30), ...over })

describe('followUpReason (regra configurável)', () => {
  it('sem retorno após N dias', () => {
    assert.equal(followUpReason(mk({ lastActivityAt: day(-6) }), { days: 7 }), null)
    assert.match(followUpReason(mk({ lastActivityAt: day(-7) }), { days: 7 }).text, /Sem retorno há 7 dias/)
    assert.match(followUpReason(mk({ lastActivityAt: day(-3) }), { days: 3 }).text, /Sem retorno/)
  })
  it('o limite configurado muda o resultado', () => {
    const p = mk({ lastActivityAt: day(-10) })
    assert.ok(followUpReason(p, { days: 7 })); assert.ok(followUpReason(p, { days: 3 })); assert.equal(followUpReason(p, { days: 14 }), null)
  })
  it('próxima ação vencida ou hoje (vale para rascunho também)', () => {
    assert.match(followUpReason(mk({ status: 'draft', nextActionDate: day(-2) })).text, /vencida há 2 dias/)
    assert.match(followUpReason(mk({ status: 'draft', nextActionDate: day(0) })).text, /hoje/)
    assert.equal(followUpReason(mk({ status: 'draft', nextActionDate: day(2) })), null)
  })
  it('validade vencida só para enviada/em negociação', () => {
    assert.equal(followUpReason(mk({ validUntil: day(-1) })).kind, 'validity')
    assert.equal(followUpReason(mk({ status: 'draft', validUntil: day(-1) })), null)
  })
  it('rascunho não entra na regra de "sem retorno"', () => assert.equal(followUpReason(mk({ status: 'draft', lastActivityAt: day(-60) })), null))
  it('propostas encerradas nunca pedem retorno', () => {
    for (const status of ['accepted', 'rejected', 'expired']) assert.equal(followUpReason(mk({ status, nextActionDate: day(-5), lastActivityAt: day(-90) })), null)
  })
  it('sem data de atividade (gravação pendente) não dispara', () => assert.equal(followUpReason(mk({ lastActivityAt: null, createdAt: null })), null))
  it('o texto da regra cita o prazo configurado', () => { assert.match(followUpRuleText(14), /14 dias/); assert.deepEqual(FOLLOW_UP_DAY_OPTIONS, [3, 7, 14, 30]) })
})

describe('filtros e ordenação', () => {
  const list = [mk({ id: 'a', status: 'draft', title: 'Landing' }), mk({ id: 'b', status: 'sent' }), mk({ id: 'c', status: 'accepted' }), mk({ id: 'd', status: 'rejected' }), mk({ id: 'e', status: 'expired' })]
  const ids = (f, clients) => filterProposals(list, f, clients).map((p) => p.id).sort()
  it('em aberto = rascunho + enviada + negociação', () => assert.deepEqual(ids({ view: 'open' }), ['a', 'b']))
  it('cada status', () => { assert.deepEqual(ids({ view: 'accepted' }), ['c']); assert.deepEqual(ids({ view: 'rejected' }), ['d']); assert.deepEqual(ids({ view: 'expired' }), ['e']) })
  it('todas', () => assert.equal(ids({ view: 'all' }).length, 5))
  it('busca por título e por nome do cliente', () => {
    assert.deepEqual(ids({ view: 'all', search: 'landing' }), ['a'])
    assert.deepEqual(ids({ view: 'all', search: 'ana' }, { c1: { name: 'Ana Souza' } }).length, 5)
  })
  it('próxima ação mais próxima primeiro', () => assert.deepEqual(sortProposals([mk({ id: 'x' }), mk({ id: 'y', nextActionDate: day(3) }), mk({ id: 'z', nextActionDate: day(1) })]).map((p) => p.id), ['z', 'y', 'x']))
})

describe('dinheiro', () => {
  it('soma por moeda sem misturar, só propostas aguardando resposta', () => {
    const t = pipelineTotals([mk({ amount: 100 }), mk({ amount: 50, status: 'negotiation' }), mk({ amount: 20, currency: 'USD' }), mk({ amount: 999, status: 'accepted' }), mk({ amount: 7, status: 'draft' })])
    assert.deepEqual(t, { BRL: 150, USD: 20 })
  })
  it('arredonda conforme a moeda (BRL 2 casas, PYG 0)', () => { assert.equal(roundMoney(10.126, 'BRL'), 10.13); assert.equal(roundMoney(15000.4, 'PYG'), 15000) })
  it('arredonda pelo valor decimal digitado (sem erro de ponto flutuante)', () => {
    for (const [typed, want] of [['1.005', 1.01], ['1.255', 1.26], ['2.675', 2.68], ['8.345', 8.35], ['0.615', 0.62], ['1234.567', 1234.57], ['4200.5', 4200.5], ['0.1', 0.1], ['0.285', 0.29], ['1.115', 1.12]]) {
      assert.equal(roundMoney(Number(typed), 'BRL'), want, typed)
    }
  })
  it('arredondamento: negativos, zero, enormes e moeda sem centavos', () => {
    assert.equal(roundMoney(-1.005, 'BRL'), -1.01); assert.equal(roundMoney(0, 'BRL'), 0); assert.equal(roundMoney(999999999999.99, 'BRL'), 999999999999.99)
    assert.equal(roundMoney(15000.5, 'PYG'), 15001); assert.equal(roundMoney(14999.4, 'PYG'), 14999); assert.equal(roundMoney(0.0000001, 'BRL'), 0)
  })
  it('somar centavos não acumula erro: 0,1 + 0,2 = 0,3 e 100 parcelas de 0,10 = 10,00', () => {
    assert.equal(roundMoney(0.1 + 0.2, 'BRL'), 0.3)
    assert.equal(roundMoney(Array.from({ length: 100 }, () => 0.1).reduce((a, b) => a + b, 0), 'BRL'), 10)
  })
  it('valor guardado é número e formatado só na exibição', () => {
    assert.equal(typeof roundMoney(4200, 'BRL'), 'number')
    assert.match(formatMoney(4200, 'BRL'), /4\.200,00/)
    assert.match(formatMoney(500, 'USD'), /500,00/)
    assert.doesNotMatch(formatMoney(15000, 'PYG'), /,/)
  })
  it('parseAmount', () => { assert.equal(parseAmount('12.5'), 12.5); assert.ok(Number.isNaN(parseAmount(' '))); assert.ok(Number.isNaN(parseAmount('abc'))) })
})

describe('validateProposal', () => {
  const ok = { title: 'Site', summary: '', clientId: 'c1', amount: '1500.50', currency: 'BRL', sentDate: '', validUntil: '', status: 'draft', nextAction: '', nextActionDate: '' }
  it('mínimo válido', () => assert.deepEqual(validateProposal(ok), {}))
  it('exige título, cliente e valor', () => {
    assert.ok(validateProposal({ ...ok, title: ' ' }).title); assert.ok(validateProposal({ ...ok, clientId: '' }).clientId)
    assert.ok(validateProposal({ ...ok, amount: '' }).amount); assert.ok(validateProposal({ ...ok, amount: '-5' }).amount); assert.ok(validateProposal({ ...ok, amount: 'abc' }).amount)
  })
  it('moeda desconhecida', () => assert.ok(validateProposal({ ...ok, currency: 'XYZ' }).currency))
  it('novo: não aceita "aceita" direto; edição não valida status', () => {
    assert.ok(validateProposal({ ...ok, status: 'accepted' }).status)
    assert.equal(validateProposal({ ...ok, status: 'accepted' }, { creating: false }).status, undefined)
  })
  it('validade não pode ser antes do envio', () => assert.ok(validateProposal({ ...ok, sentDate: '2026-10-10', validUntil: '2026-10-01' }).validUntil))
})
