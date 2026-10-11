// Testes dos alertas internos (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ALERT_TYPES, ALERT_TYPE_IDS, buildAlerts, countByType } from '../src/utils/alerts.js'

const NOW = new Date(2026, 9, 15, 12)
const at = (n) => new Date(2026, 9, 15 + n)
let n = 0
const task = (over) => ({ id: `t${n++}`, title: 'Tarefa', status: 'todo', due: at(0), ...over })
const project = (over) => ({ id: `p${n++}`, name: 'Projeto', status: 'active', dueDate: at(0), ...over })
const proposal = (over) => ({ id: `r${n++}`, title: 'Proposta', status: 'sent', nextActionDate: null, validUntil: null, lastActivityAt: at(0), createdAt: at(-30), ...over })
const tx = (over) => ({ id: `x${n++}`, description: 'Parcela', type: 'income', status: 'pending', dueDate: at(0), ...over })
const run = (data, settings = {}) => buildAlerts({ now: NOW, settings: { followUpDays: 7, ...settings }, ...data })
const types = (alerts) => alerts.map((a) => a.type)

describe('critérios de cada alerta', () => {
  it('tarefa atrasada (aberta, prazo anterior a hoje)', () => assert.deepEqual(types(run({ tasks: [task({ due: at(-1) })] })), ['task_overdue']))
  it('tarefa com prazo próximo: hoje até o limite (padrão 2 dias)', () => {
    assert.deepEqual(types(run({ tasks: [task({ due: at(0) })] })), ['task_due_soon']); assert.deepEqual(types(run({ tasks: [task({ due: at(2) })] })), ['task_due_soon'])
    assert.deepEqual(run({ tasks: [task({ due: at(3) })] }), [])
  })
  it('atrasada e prazo próximo nunca se sobrepõem', () => { const a = run({ tasks: [task({ due: at(-3) }), task({ due: at(1) })] }); assert.deepEqual(types(a).sort(), ['task_due_soon', 'task_overdue']) })
  it('ignora tarefas concluídas, canceladas e sem prazo', () => assert.deepEqual(run({ tasks: [task({ status: 'done', due: at(-5) }), task({ status: 'cancelled', due: at(-5) }), task({ due: null })] }), []))
  it('projetos: atrasado e prazo próximo; ignora concluído/arquivado/sem prazo', () => {
    const a = run({ projects: [project({ dueDate: at(-2) }), project({ dueDate: at(1) }), project({ status: 'completed', dueDate: at(-9) }), project({ status: 'archived', dueDate: at(-9) }), project({ dueDate: null })] })
    assert.deepEqual(types(a).sort(), ['project_due_soon', 'project_overdue'])
  })
  it('proposta que pede retorno (usa a regra do módulo Comercial)', () => {
    assert.deepEqual(types(run({ proposals: [proposal({ lastActivityAt: at(-10) })] })), ['follow_up'])
    assert.deepEqual(run({ proposals: [proposal({ status: 'accepted', lastActivityAt: at(-90) })] }), [])
  })
  it('lançamento vencido (pendente com vencimento passado); previsto/pago não', () => {
    assert.deepEqual(types(run({ transactions: [tx({ dueDate: at(-1) }), tx({ status: 'planned', dueDate: at(-9) }), tx({ status: 'paid', dueDate: at(-9) })] })), ['payment_overdue'])
  })
  it('todos os tipos têm regra documentada', () => { assert.deepEqual(ALERT_TYPES.map((a) => a.id), ALERT_TYPE_IDS); assert.ok(ALERT_TYPES.every((a) => a.rule.length > 10 && a.label)) })
})

describe('motivo, ação e link para o registro correto', () => {
  it('cada alerta tem motivo, ação e link do próprio registro', () => {
    const data = {
      tasks: [task({ id: 'T1', due: at(-1) })], projects: [project({ id: 'P1', dueDate: at(-1) })], proposals: [proposal({ id: 'R1', lastActivityAt: at(-10) })], transactions: [tx({ id: 'X1', dueDate: at(-1) })],
    }
    const a = run(data)
    const hrefs = Object.fromEntries(a.map((x) => [x.type, x.href]))
    assert.deepEqual(hrefs, { task_overdue: '#/tarefas/T1', project_overdue: '#/projetos/P1', follow_up: '#/comercial/R1', payment_overdue: '#/financeiro/X1' })
    for (const x of a) { assert.ok(x.detail.length > 5, 'motivo'); assert.ok(x.action.length > 5, 'ação'); assert.ok(x.label && x.title) }
  })
  it('todos os tipos declaram uma ação', () => assert.ok(ALERT_TYPES.every((t) => t.action && t.action.length > 5)))
})

describe('projeto aguardando cliente (bloqueado)', () => {
  it('gera alerta quando está aguardando e não há prazo próximo', () => {
    const a = run({ projects: [project({ id: 'B', status: 'waiting_client', dueDate: at(30) }), project({ id: 'C', status: 'waiting_client', dueDate: null })] })
    assert.deepEqual(a.map((x) => x.type), ['project_blocked', 'project_blocked'])
  })
  it('o prazo tem prioridade: o mesmo projeto não aparece duas vezes', () => {
    assert.deepEqual(types(run({ projects: [project({ id: 'D', status: 'waiting_client', dueDate: at(-3) })] })), ['project_overdue'])
    assert.deepEqual(types(run({ projects: [project({ id: 'E', status: 'waiting_client', dueDate: at(1) })] })), ['project_due_soon'])
  })
  it('desligar o alerta de prazo NÃO faz o de bloqueio aparecer no lugar', () => assert.deepEqual(run({ projects: [project({ status: 'waiting_client', dueDate: at(-3) })] }, { disabled: ['project_overdue'] }), []))
  it('só projetos em andamento; ativo normal não é bloqueado', () => assert.deepEqual(run({ projects: [project({ status: 'active', dueDate: at(30) }), project({ status: 'archived' })] }), []))
})

describe('sem alertas duplicados e estáveis', () => {
  const data = { tasks: [task({ id: 'T', due: at(-1) }), task({ id: 'T', due: at(-1) })], projects: [project({ id: 'P', dueDate: at(1) })] }
  it('mesma condição/entidade = um único alerta (chave estável)', () => { const a = run(data); assert.equal(a.length, 2); assert.equal(new Set(a.map((x) => x.key)).size, 2); assert.ok(a.some((x) => x.key === 'task_overdue:T')) })
  it('renderizar várias vezes dá exatamente o mesmo resultado', () => {
    const first = run(data), second = run(data), third = run(data)
    assert.deepEqual(first, second); assert.deepEqual(second, third); assert.equal(first.length, 2)
  })
  it('a mesma tarefa nunca gera dois tipos de alerta ao mesmo tempo', () => { const t = task({ id: 'U', due: at(-1) }); assert.equal(run({ tasks: [t] }).filter((a) => a.key.endsWith(':U')).length, 1) })
  it('resolver a condição remove o alerta', () => { assert.equal(run({ tasks: [task({ id: 'V', due: at(-1) })] }).length, 1); assert.equal(run({ tasks: [task({ id: 'V', due: at(-1), status: 'done' })] }).length, 0) })
  it('não altera os dados de entrada', () => { const copy = JSON.stringify(data); run(data); assert.equal(JSON.stringify(data), copy) })
})

describe('configuração', () => {
  it('limite de prazo próximo configurável', () => {
    const tasks = [task({ due: at(3) }), task({ due: at(7) })]
    assert.equal(run({ tasks }, { dueSoonDays: 1 }).length, 0); assert.equal(run({ tasks }, { dueSoonDays: 3 }).length, 1); assert.equal(run({ tasks }, { dueSoonDays: 7 }).length, 2)
  })
  it('tipos podem ser desligados', () => {
    const data = { tasks: [task({ due: at(-1) })], projects: [project({ dueDate: at(-1) })] }
    assert.deepEqual(types(run(data, { disabled: ['task_overdue'] })), ['project_overdue']); assert.equal(run(data, { disabled: ALERT_TYPE_IDS }).length, 0)
  })
  it('prazo de follow-up configurável', () => {
    const proposals = [proposal({ lastActivityAt: at(-5) })]
    assert.equal(run({ proposals }, { followUpDays: 7 }).length, 0); assert.equal(run({ proposals }, { followUpDays: 3 }).length, 1)
  })
})

describe('ordem e contagem', () => {
  it('críticos antes de avisos; depois pela data mais antiga', () => {
    const a = run({ tasks: [task({ id: 'a', due: at(1) }), task({ id: 'b', due: at(-1) }), task({ id: 'c', due: at(-5) })] })
    assert.deepEqual(a.map((x) => x.key), ['task_overdue:c', 'task_overdue:b', 'task_due_soon:a'])
    assert.deepEqual(a.map((x) => x.severity), ['danger', 'danger', 'warn'])
  })
  it('contagem por tipo bate com a lista', () => {
    const a = run({ tasks: [task({ due: at(-1) }), task({ due: at(-2) })], projects: [project({ dueDate: at(0) })] })
    assert.deepEqual(countByType(a), { task_overdue: 2, project_due_soon: 1 }); assert.equal(Object.values(countByType(a)).reduce((x, y) => x + y, 0), a.length)
  })
  it('sem dados, sem alertas', () => assert.deepEqual(run({}), []))
})
