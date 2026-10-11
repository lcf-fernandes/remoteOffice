// Testes de modelos de projeto (sem Firebase): npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BUILTIN_TEMPLATES, MAX_TEMPLATE_TASKS, buildProjectPlan, findTemplate, hasErrors, normalizeTemplateTasks, taskDueDate, tasksToForm, validateTemplate, validateWizard } from '../src/utils/templates.js'
import { PROJECT_TYPE_OPTIONS } from '../src/utils/projects.js'
import { PRIORITY_OPTIONS } from '../src/utils/tasks.js'

const d = (m, day) => new Date(2026, m - 1, day)

describe('modelos padrão', () => {
  it('cobrem os tipos comuns e são válidos', () => {
    assert.ok(BUILTIN_TEMPLATES.length >= 4)
    assert.deepEqual([...new Set(BUILTIN_TEMPLATES.map((t) => t.projectType))].sort(), ['development', 'editing', 'social_media'])
    for (const t of BUILTIN_TEMPLATES) {
      assert.ok(t.builtin && t.id.startsWith('builtin:'))
      assert.ok(PROJECT_TYPE_OPTIONS.some((o) => o.value === t.projectType))
      assert.ok(t.tasks.length >= 1 && t.tasks.length <= MAX_TEMPLATE_TASKS)
      assert.ok(t.tasks.every((x) => x.title && PRIORITY_OPTIONS.some((o) => o.value === x.priority)))
      assert.ok(!hasErrors(validateTemplate({ name: t.name, description: t.description, projectType: t.projectType, tasks: tasksToForm(t.tasks) })))
    }
  })
  it('ids únicos e busca por id', () => {
    assert.equal(new Set(BUILTIN_TEMPLATES.map((t) => t.id)).size, BUILTIN_TEMPLATES.length)
    assert.equal(findTemplate(BUILTIN_TEMPLATES, 'builtin:video').name, 'Vídeo institucional')
    assert.equal(findTemplate(BUILTIN_TEMPLATES, 'nao-existe'), null)
  })
})

describe('prazos das tarefas', () => {
  it('início + deslocamento em dias', () => { assert.equal(taskDueDate(d(10, 1), 0).getTime(), d(10, 1).getTime()); assert.equal(taskDueDate(d(10, 1), 15).getTime(), d(10, 16).getTime()); assert.equal(taskDueDate(d(10, 25), 10).getTime(), d(11, 4).getTime()) })
  it('sem início ou sem deslocamento = sem prazo', () => { assert.equal(taskDueDate(null, 5), null); assert.equal(taskDueDate(d(10, 1), null), null); assert.equal(taskDueDate(d(10, 1), undefined), null) })
})

describe('plano de criação (o que será gravado)', () => {
  const template = { tasks: [{ title: 'A', priority: 'high', offsetDays: 2, category: 'X', description: '' }, { title: 'B', priority: 'low', offsetDays: null, category: '', description: 'd' }, { title: 'C', priority: 'medium', offsetDays: 10, category: '', description: '' }] }
  const values = { name: ' Meu projeto ', description: '', clientId: 'c1', type: 'editing', priority: 'high', startDate: '2026-10-01', dueDate: '2026-12-01' }
  it('só inclui as tarefas selecionadas, na ordem do modelo', () => {
    const plan = buildProjectPlan(template, [2, 0], values)
    assert.deepEqual(plan.tasks.map((t) => t.title), ['A', 'C'])
    assert.equal(plan.tasks[0].due.getTime(), d(10, 3).getTime()); assert.equal(plan.tasks[1].due.getTime(), d(10, 11).getTime())
  })
  it('nenhuma tarefa marcada = só o projeto', () => assert.equal(buildProjectPlan(template, [], values).tasks.length, 0))
  it('projeto: nome aparado, status inicial planejamento, cliente herdado pelas tarefas', () => {
    const plan = buildProjectPlan(template, [0, 1, 2], values)
    assert.equal(plan.project.name, 'Meu projeto'); assert.equal(plan.project.status, 'planning'); assert.equal(plan.project.clientId, 'c1'); assert.equal(plan.project.type, 'editing')
    assert.ok(plan.tasks.every((t) => t.clientId === 'c1'))
    assert.equal(plan.tasks[1].due, null) // sem deslocamento
  })
  it('sem data de início, nenhuma tarefa tem prazo', () => assert.ok(buildProjectPlan(template, [0, 1, 2], { ...values, startDate: '' }).tasks.every((t) => t.due === null)))
  it('sem cliente: nulo no projeto e nas tarefas', () => { const plan = buildProjectPlan(template, [0], { ...values, clientId: '' }); assert.equal(plan.project.clientId, null); assert.equal(plan.tasks[0].clientId, null) })
  it('índices fora do modelo são ignorados; duplicados não repetem tarefas', () => assert.deepEqual(buildProjectPlan(template, [0, 0, 9], values).tasks.map((t) => t.title), ['A']))
  it('não altera o modelo original', () => { const copy = JSON.stringify(template); buildProjectPlan(template, [0, 1], values); assert.equal(JSON.stringify(template), copy) })
})

describe('validações', () => {
  const task = { title: 'T', description: '', priority: 'medium', offsetDays: '', category: '' }
  const ok = { name: 'Modelo', description: '', projectType: 'development', tasks: [task] }
  it('modelo mínimo válido', () => assert.equal(hasErrors(validateTemplate(ok)), false))
  it('nome e ao menos uma tarefa', () => { assert.ok(validateTemplate({ ...ok, name: ' ' }).name); assert.ok(validateTemplate({ ...ok, tasks: [] }).tasks) })
  it('máximo de tarefas', () => assert.ok(validateTemplate({ ...ok, tasks: Array(MAX_TEMPLATE_TASKS + 1).fill(task) }).tasks))
  it('erros por tarefa (título, deslocamento inválido)', () => {
    const e = validateTemplate({ ...ok, tasks: [task, { ...task, title: '' }, { ...task, offsetDays: '-1' }, { ...task, offsetDays: '1.5' }, { ...task, offsetDays: '400' }, { ...task, offsetDays: '10' }] })
    assert.ok(e.taskErrors[1].title); assert.ok(e.taskErrors[2].offsetDays); assert.ok(e.taskErrors[3].offsetDays); assert.ok(e.taskErrors[4].offsetDays)
    assert.equal(e.taskErrors[0], undefined); assert.equal(e.taskErrors[5], undefined)
  })
  it('normalização para gravar', () => assert.deepEqual(normalizeTemplateTasks([{ title: ' A ', description: ' d ', priority: 'low', offsetDays: '7', category: ' c ' }, { ...task }]), [{ title: 'A', description: 'd', priority: 'low', offsetDays: 7, category: 'c' }, { title: 'T', description: '', priority: 'medium', offsetDays: null, category: '' }]))
  it('ida e volta formulário ↔ dados', () => { const saved = [{ title: 'A', description: '', priority: 'high', offsetDays: 0, category: '' }]; assert.deepEqual(normalizeTemplateTasks(tasksToForm(saved)), saved) })
  it('assistente: nome obrigatório e datas coerentes', () => {
    const v = { name: 'P', startDate: '2026-10-10', dueDate: '2026-10-20' }
    assert.deepEqual(validateWizard(v), {}); assert.ok(validateWizard({ ...v, name: ' ' }).name); assert.ok(validateWizard({ ...v, dueDate: '2026-10-01' }).dueDate); assert.ok(validateWizard({ ...v, startDate: '2026-02-31' }).startDate)
  })
})
