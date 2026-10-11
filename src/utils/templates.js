// Commit 19 — modelos de projeto. Um modelo é só uma lista de tarefas sugeridas: NADA é criado até o usuário
// revisar a lista e confirmar (ver TemplateWizard). Prazos das tarefas = data de início do projeto + deslocamento em dias.
import { addDays, startOfDay } from './agenda.js'
import { PROJECT_TYPE_OPTIONS } from './projects.js'
import { PRIORITY_OPTIONS, inputToDate } from './tasks.js'

export const MAX_TEMPLATE_TASKS = 30
export const MAX_OFFSET_DAYS = 365

const t = (title, priority, offsetDays, category = '', description = '') => ({ title, description, priority, offsetDays, category })

// Modelos padrão (somente leitura; podem ser duplicados como modelos próprios).
export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin:site', builtin: true, name: 'Site institucional', projectType: 'development',
    description: 'Do levantamento à publicação de um site de apresentação.',
    tasks: [
      t('Levantamento de requisitos e conteúdo', 'high', 3, 'Planejamento'), t('Estrutura de páginas e wireframes', 'medium', 7, 'Planejamento'),
      t('Design das telas principais', 'medium', 14, 'Design'), t('Implementação das páginas', 'high', 28, 'Desenvolvimento'),
      t('Responsividade e acessibilidade', 'medium', 32, 'Desenvolvimento'), t('Testes e correções', 'high', 36, 'Qualidade'),
      t('Publicação e configuração de domínio', 'high', 40, 'Entrega'), t('Treinamento e entrega ao cliente', 'low', 42, 'Entrega'),
    ],
  },
  {
    id: 'builtin:app', builtin: true, name: 'Aplicativo ou sistema web', projectType: 'development',
    description: 'Ciclo básico de um sistema com login e banco de dados.',
    tasks: [
      t('Definição de escopo e requisitos', 'high', 5, 'Planejamento'), t('Modelagem de dados e arquitetura', 'high', 10, 'Planejamento'),
      t('Autenticação e permissões', 'high', 17, 'Desenvolvimento'), t('Funcionalidades principais', 'high', 40, 'Desenvolvimento'),
      t('Regras de segurança e validações', 'high', 45, 'Segurança'), t('Testes e correções', 'medium', 52, 'Qualidade'),
      t('Publicação e monitoramento', 'medium', 56, 'Entrega'), t('Documentação', 'low', 60, 'Entrega'),
    ],
  },
  {
    id: 'builtin:video', builtin: true, name: 'Vídeo institucional', projectType: 'editing',
    description: 'Fila de produção de um vídeo: briefing, edição, revisão e entrega.',
    tasks: [
      t('Briefing e referências', 'high', 2, 'Pré-produção'), t('Receber e organizar o material bruto', 'high', 5, 'Pré-produção'),
      t('Corte inicial (primeira versão)', 'high', 10, 'Edição'), t('Trilha, cor e áudio', 'medium', 14, 'Pós-produção'),
      t('Envio para revisão do cliente', 'high', 16, 'Revisão'), t('Ajustes pós-revisão', 'high', 20, 'Revisão'),
      t('Exportação final e legendas', 'medium', 22, 'Entrega'), t('Entrega e arquivamento do projeto', 'low', 23, 'Entrega'),
    ],
  },
  {
    id: 'builtin:social', builtin: true, name: 'Pacote mensal de social media', projectType: 'social_media',
    description: 'Planejamento e produção recorrente de conteúdo para um mês.',
    tasks: [
      t('Calendário editorial do mês', 'high', 3, 'Planejamento'), t('Roteiros e legendas', 'medium', 8, 'Conteúdo'),
      t('Produção das peças / vídeos curtos', 'high', 18, 'Produção'), t('Aprovação do cliente', 'high', 21, 'Revisão'),
      t('Agendamento das publicações', 'medium', 24, 'Publicação'), t('Relatório do mês', 'low', 30, 'Relatório'),
    ],
  },
]

export const findTemplate = (templates, id) => templates.find((x) => x.id === id) ?? null

export function validateTemplate(v) {
  const e = { taskErrors: {} }
  const name = v.name.trim()
  if (!name) e.name = 'Informe o nome do modelo.'
  else if (name.length > 80) e.name = 'O nome deve ter no máximo 80 caracteres.'
  if (v.description.length > 500) e.description = 'A descrição deve ter no máximo 500 caracteres.'
  if (!PROJECT_TYPE_OPTIONS.some((o) => o.value === v.projectType)) e.projectType = 'Escolha o tipo de projeto.'
  if (v.tasks.length === 0) e.tasks = 'Inclua ao menos uma tarefa.'
  else if (v.tasks.length > MAX_TEMPLATE_TASKS) e.tasks = `Use no máximo ${MAX_TEMPLATE_TASKS} tarefas.`
  v.tasks.forEach((task, i) => {
    const te = {}
    const title = task.title.trim()
    if (!title) te.title = 'Informe o título.'
    else if (title.length > 200) te.title = 'No máximo 200 caracteres.'
    if (!PRIORITY_OPTIONS.some((o) => o.value === task.priority)) te.priority = 'Prioridade inválida.'
    const off = String(task.offsetDays ?? '').trim()
    if (off !== '' && !(/^\d+$/.test(off) && Number(off) <= MAX_OFFSET_DAYS)) te.offsetDays = `Use um número inteiro de 0 a ${MAX_OFFSET_DAYS}.`
    if ((task.category ?? '').length > 60) te.category = 'No máximo 60 caracteres.'
    if ((task.description ?? '').length > 1000) te.description = 'No máximo 1000 caracteres.'
    if (Object.keys(te).length) e.taskErrors[i] = te
  })
  if (Object.keys(e.taskErrors).length === 0) delete e.taskErrors
  return e
}
export const hasErrors = (e) => Object.keys(e).length > 0

// Formato salvo no Firestore (deslocamento vazio = sem prazo).
export const normalizeTemplateTasks = (tasks) => tasks.map((x) => ({
  title: x.title.trim(), description: (x.description ?? '').trim(), priority: x.priority,
  offsetDays: String(x.offsetDays ?? '').trim() === '' ? null : Number(x.offsetDays), category: (x.category ?? '').trim(),
}))
export const tasksToForm = (tasks) => tasks.map((x) => ({ title: x.title, description: x.description ?? '', priority: x.priority, offsetDays: x.offsetDays === null || x.offsetDays === undefined ? '' : String(x.offsetDays), category: x.category ?? '' }))

export const taskDueDate = (startDate, offsetDays) => (startDate && offsetDays !== null && offsetDays !== undefined ? addDays(startOfDay(startDate), offsetDays) : null)

export function validateWizard(v) {
  const e = {}
  const name = v.name.trim()
  if (!name) e.name = 'Informe o nome do projeto.'
  else if (name.length > 120) e.name = 'O nome deve ter no máximo 120 caracteres.'
  const start = v.startDate ? inputToDate(v.startDate) : null
  const due = v.dueDate ? inputToDate(v.dueDate) : null
  if (start === undefined) e.startDate = 'Data inválida.'
  if (due === undefined) e.dueDate = 'Data inválida.'
  if (start && due && due < start) e.dueDate = 'O prazo final não pode ser antes do início.'
  return e
}

// Plano de criação: exatamente o que será gravado. `selected` = índices das tarefas que o usuário manteve marcadas.
export function buildProjectPlan(template, selected, v) {
  const start = v.startDate ? inputToDate(v.startDate) : null
  const keep = new Set(selected)
  return {
    project: {
      name: v.name.trim(), description: (v.description ?? '').trim(), clientId: v.clientId || null, type: v.type,
      status: 'planning', priority: v.priority, startDate: start ?? null, dueDate: v.dueDate ? inputToDate(v.dueDate) : null, links: [],
    },
    tasks: template.tasks.map((x, index) => ({ x, index })).filter(({ index }) => keep.has(index)).map(({ x }) => ({
      title: x.title, description: x.description ?? '', priority: x.priority, category: x.category ?? '',
      due: taskDueDate(start, x.offsetDays ?? null), clientId: v.clientId || null,
    })),
  }
}
