// Commit 10 — constantes e lógica pura de tarefas (sem Firebase, fácil de testar).
import { daysFromToday } from './format.js'

export const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'A fazer' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'done', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
]
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]
export const PRIORITY_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label]))
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export const VIEWS = [
  { id: 'open', label: 'Abertas' },
  { id: 'today', label: 'Hoje' },
  { id: 'upcoming', label: 'Próximas' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'done', label: 'Concluídas' },
  { id: 'all', label: 'Todas' },
]

export const isOpen = (t) => t.status !== 'done' && t.status !== 'cancelled'
export const dueOffset = (t) => (t.due ? daysFromToday(t.due) : null)
export const isOverdue = (t) => isOpen(t) && dueOffset(t) !== null && dueOffset(t) < 0
export const isDueToday = (t) => isOpen(t) && dueOffset(t) === 0

export function filterTasks(tasks, { view = 'open', status = '', priority = '', search = '' } = {}) {
  const q = search.trim().toLowerCase()
  return tasks.filter((t) => {
    if (view === 'open' && !isOpen(t)) return false
    if (view === 'today' && !isDueToday(t)) return false
    if (view === 'upcoming' && !(isOpen(t) && dueOffset(t) !== null && dueOffset(t) > 0)) return false
    if (view === 'overdue' && !isOverdue(t)) return false
    if (view === 'done' && t.status !== 'done') return false
    if (status && t.status !== status) return false
    if (priority && t.priority !== priority) return false
    if (q) {
      const hay = [t.title, t.description, t.category, ...t.tags].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// Prazo mais próximo primeiro (sem prazo no fim); empate por prioridade.
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const da = a.due ? a.due.getTime() : Infinity
    const db = b.due ? b.due.getTime() : Infinity
    if (da !== db) return da - db
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  })
}

export function parseTags(text) {
  const seen = new Set()
  return text.split(',').map((s) => s.trim()).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
}

// <input type="date"> <-> Date (sempre no fuso local)
export function dateToInput(date) {
  if (!date) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}
export function inputToDate(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) || date.getMonth() !== m - 1 ? undefined : date
}

export function validateTask(values) {
  const errors = {}
  const title = values.title.trim()
  if (!title) errors.title = 'Informe um título.'
  else if (title.length > 200) errors.title = 'O título deve ter no máximo 200 caracteres.'
  if (values.description.length > 5000) errors.description = 'A descrição deve ter no máximo 5000 caracteres.'
  if (values.due && inputToDate(values.due) === undefined) errors.due = 'Data inválida.'
  const tags = parseTags(values.tags)
  if (tags.length > 20) errors.tags = 'Use no máximo 20 tags.'
  else if (tags.some((t) => t.length > 30)) errors.tags = 'Cada tag deve ter no máximo 30 caracteres.'
  if (values.category.length > 60) errors.category = 'A categoria deve ter no máximo 60 caracteres.'
  return errors
}
