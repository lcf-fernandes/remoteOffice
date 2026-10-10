// Commit 12 — constantes e lógica pura de projetos.
import { daysFromToday } from './format.js'
import { inputToDate } from './tasks.js'

export const PROJECT_TYPE_OPTIONS = [
  { value: 'development', label: 'Desenvolvimento' },
  { value: 'editing', label: 'Edição' },
  { value: 'social_media', label: 'Social media' },
  { value: 'internal', label: 'Interno' },
  { value: 'other', label: 'Outro' },
]
export const PROJECT_TYPE_LABEL = Object.fromEntries(PROJECT_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export const PROJECT_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'active', label: 'Ativo' },
  { value: 'waiting_client', label: 'Aguardando cliente' },
  { value: 'review', label: 'Em revisão' },
  { value: 'completed', label: 'Concluído' },
  { value: 'archived', label: 'Arquivado' },
]
export const PROJECT_STATUS_LABEL = Object.fromEntries(PROJECT_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export const PROJECT_VIEWS = [
  { id: 'open', label: 'Em andamento' },
  { id: 'completed', label: 'Concluídos' },
  { id: 'archived', label: 'Arquivados' },
  { id: 'all', label: 'Todos' },
]

export const OPEN_STATUSES = ['planning', 'active', 'waiting_client', 'review']
export const isOpenProject = (p) => OPEN_STATUSES.includes(p.status)

// Colunas do Kanban para cada visão (o Kanban usa exatamente os mesmos projetos filtrados da lista).
export function kanbanColumns(view) {
  if (view === 'open') return OPEN_STATUSES
  if (view === 'completed') return ['completed']
  if (view === 'archived') return ['archived']
  return [...OPEN_STATUSES, 'completed', 'archived']
}

export function filterProjects(projects, { view = 'open', search = '', type = '' } = {}) {
  const q = search.trim().toLowerCase()
  return projects.filter((p) => {
    if (view === 'open' && !isOpenProject(p)) return false
    if (view === 'completed' && p.status !== 'completed') return false
    if (view === 'archived' && p.status !== 'archived') return false
    if (type && p.type !== type) return false
    if (q && ![p.name, p.description].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}

// Prazo mais próximo primeiro; sem prazo por último.
export const sortProjects = (projects) =>
  [...projects].sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) || a.name.localeCompare(b.name, 'pt-BR'))

// REGRA DE PROGRESSO (exibida na tela): tarefas concluídas ÷ tarefas não canceladas.
export function projectProgress(tasks) {
  const counted = tasks.filter((t) => t.status !== 'cancelled')
  const done = counted.filter((t) => t.status === 'done').length
  return { done, total: counted.length, percent: counted.length ? Math.round((done / counted.length) * 100) : null }
}
export const PROGRESS_RULE = 'Progresso = tarefas concluídas ÷ tarefas não canceladas.'

export function progressByProject(tasks) {
  const groups = {}
  tasks.forEach((t) => { if (t.projectId) (groups[t.projectId] ??= []).push(t) })
  return Object.fromEntries(Object.entries(groups).map(([id, list]) => [id, projectProgress(list)]))
}
export const EMPTY_PROGRESS = { done: 0, total: 0, percent: null }

export const projectIsLate = (p) => isOpenProject(p) && !!p.dueDate && daysFromToday(p.dueDate) < 0

// Motivo de atenção (ou null). Ordem: atrasado > aguardando cliente > entrega em até 7 dias.
export function attentionReason(p) {
  if (!isOpenProject(p)) return null
  if (projectIsLate(p)) return `Prazo vencido há ${Math.abs(daysFromToday(p.dueDate))} ${Math.abs(daysFromToday(p.dueDate)) === 1 ? 'dia' : 'dias'}`
  if (p.status === 'waiting_client') return 'Aguardando retorno do cliente'
  if (p.dueDate && daysFromToday(p.dueDate) <= 7) return 'Entrega nos próximos 7 dias'
  return null
}

export const parseLinks = (text) => [...new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))]
export function isValidUrl(value) {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}
export function linkLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function validateProject(v) {
  const e = {}
  const name = v.name.trim()
  if (!name) e.name = 'Informe o nome do projeto.'
  else if (name.length > 120) e.name = 'O nome deve ter no máximo 120 caracteres.'
  if (v.description.length > 5000) e.description = 'A descrição deve ter no máximo 5000 caracteres.'
  const start = v.startDate ? inputToDate(v.startDate) : null
  const due = v.dueDate ? inputToDate(v.dueDate) : null
  if (start === undefined) e.startDate = 'Data inválida.'
  if (due === undefined) e.dueDate = 'Data inválida.'
  if (start && due && due < start) e.dueDate = 'O prazo final não pode ser antes do início.'
  const links = parseLinks(v.links)
  if (links.length > 10) e.links = 'Use no máximo 10 links.'
  else if (links.some((l) => !isValidUrl(l))) e.links = 'Cada linha deve ser um endereço completo, começando com http:// ou https://.'
  else if (links.some((l) => l.length > 500)) e.links = 'Cada link deve ter no máximo 500 caracteres.'
  return e
}

export function validateMilestone(v) {
  const e = {}
  const title = v.title.trim()
  if (!title) e.title = 'Informe o marco.'
  else if (title.length > 160) e.title = 'O marco deve ter no máximo 160 caracteres.'
  if (v.date && inputToDate(v.date) === undefined) e.date = 'Data inválida.'
  return e
}

export function validateJournal(v) {
  const e = {}
  if (!v.date || inputToDate(v.date) === undefined) e.date = 'Informe uma data válida.'
  const text = v.text.trim()
  if (!text) e.text = 'Escreva o registro.'
  else if (text.length > 5000) e.text = 'O registro deve ter no máximo 5000 caracteres.'
  return e
}
