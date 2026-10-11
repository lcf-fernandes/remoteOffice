// Testes dos indicadores do dashboard (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dashboardStats, isWorkspaceEmpty, sourcesState } from '../src/utils/dashboard.js'
import { buildAlerts, countByType } from '../src/utils/alerts.js'

const NOW = new Date(2026, 9, 15, 12)
const at = (n) => new Date(2026, 9, 15 + n)
let i = 0
const task = (over) => ({ id: `t${i++}`, title: 'T', status: 'todo', due: null, ...over })
const project = (over) => ({ id: `p${i++}`, name: 'P', status: 'active', dueDate: null, ...over })

describe('indicadores', () => {
  const tasks = [task({ due: at(-2) }), task({ due: at(0) }), task({ due: at(5) }), task({ status: 'done', due: at(-9) }), task({ status: 'cancelled' }), task()]
  const projects = [project({ dueDate: at(-1) }), project({ dueDate: at(0) }), project({ dueDate: at(7) }), project({ dueDate: at(8) }), project({ status: 'completed', dueDate: at(2) }), project({ status: 'archived' }), project()]
  const s = dashboardStats({ tasks, projects, now: NOW })
  it('tarefas abertas não contam concluídas nem canceladas', () => assert.equal(s.openTasks, 4))
  it('tarefas atrasadas: abertas com prazo anterior a hoje', () => assert.equal(s.overdueTasks, 1))
  it('projetos em andamento: sem concluídos/arquivados', () => assert.equal(s.activeProjects, 5))
  it('entregas em até 7 dias: de hoje a +7; vencidos e distantes ficam de fora', () => assert.equal(s.projectsDueIn7Days, 2))
  it('sem dados: zeros reais (não erro)', () => assert.deepEqual(dashboardStats({ now: NOW }), { openTasks: 0, overdueTasks: 0, activeProjects: 0, projectsDueIn7Days: 0 }))
  it('consistente com os alertas: atrasadas = alertas de tarefa atrasada', () => {
    const alerts = buildAlerts({ tasks, projects, now: NOW, settings: {} })
    assert.equal(countByType(alerts).task_overdue ?? 0, s.overdueTasks)
  })
  it('consistente com os alertas: projetos vencidos nunca entram em "entregas em 7 dias"', () => {
    const alerts = buildAlerts({ projects, now: NOW, settings: { dueSoonDays: 7 } })
    assert.equal(countByType(alerts).project_overdue, 1); assert.equal(countByType(alerts).project_due_soon, s.projectsDueIn7Days)
  })
})

describe('área de trabalho vazia', () => {
  const zero = { tasks: 0, projects: 0, clients: 0, events: 0, proposals: 0, transactions: 0, notes: 0, workLog: 0, time: 0, templates: 0 }
  it('vazia só quando TODOS os módulos estão vazios', () => assert.equal(isWorkspaceEmpty(zero), true))
  it('qualquer registro em qualquer módulo desativa o guia inicial', () => { for (const k of Object.keys(zero)) assert.equal(isWorkspaceEmpty({ ...zero, [k]: 1 }), false, k) })
})

describe('estado das fontes dos alertas', () => {
  it('tudo carregado', () => assert.deepEqual(sourcesState({ tasks: 'ready', projects: 'ready', proposals: 'ready', transactions: 'ready' }), { failed: [], loading: false, ready: true }))
  it('carregando não é "tudo em dia"', () => { const s = sourcesState({ tasks: 'ready', projects: 'loading', proposals: 'ready', transactions: 'ready' }); assert.equal(s.loading, true); assert.equal(s.ready, false) })
  it('falha em uma fonte é informada pelo nome', () => { const s = sourcesState({ tasks: 'error', projects: 'ready', proposals: 'error', transactions: 'ready' }); assert.deepEqual(s.failed, ['tarefas', 'propostas']); assert.equal(s.ready, false) })
})
