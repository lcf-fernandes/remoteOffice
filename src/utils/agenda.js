// Commit 13 — junta eventos, prazos de tarefas e prazos de projetos em uma lista única,
// sempre identificando a origem (Evento / Prazo de tarefa / Prazo de projeto).
import { isOpen } from './tasks.js'
import { isOpenProject } from './projects.js'

export const KIND_LABEL = { event: 'Evento', task: 'Prazo de tarefa', project: 'Prazo de projeto' }
export const KIND_ORDER = { event: 0, task: 1, project: 2 }

const p2 = (n) => String(n).padStart(2, '0')
export const dayKey = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function buildAgendaItems({ events = [], tasks = [], projects = [] }) {
  const items = []
  events.forEach((e) => items.push({ key: `e:${e.id}`, kind: 'event', subtype: e.type, title: e.title, start: e.start, end: e.end, allDay: e.allDay, ref: e }))
  tasks.filter((t) => isOpen(t) && t.due).forEach((t) => items.push({ key: `t:${t.id}`, kind: 'task', title: t.title, start: t.due, end: null, allDay: true, ref: t }))
  projects.filter((p) => isOpenProject(p) && p.dueDate).forEach((p) => items.push({ key: `p:${p.id}`, kind: 'project', title: p.name, start: p.dueDate, end: null, allDay: true, ref: p }))
  return items.sort((a, b) => {
    const da = startOfDay(a.start).getTime(), db = startOfDay(b.start).getTime()
    if (da !== db) return da - db
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1 // dia inteiro/prazos antes dos horários
    return a.start - b.start || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  })
}

export const AGENDA_RANGES = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: '7 dias' },
  { id: 'month', label: '30 dias' },
  { id: 'overdue', label: 'Prazos vencidos' },
]
export const AGENDA_SOURCES = [
  { value: 'all', label: 'Tudo' },
  { value: 'event', label: 'Eventos' },
  { value: 'task', label: 'Prazos de tarefas' },
  { value: 'project', label: 'Prazos de projetos' },
]

export function filterAgenda(items, { range = 'week', source = 'all', now = new Date() } = {}) {
  const today = startOfDay(now)
  return items.filter((i) => {
    if (source !== 'all' && i.kind !== source) return false
    const day = startOfDay(i.start)
    if (range === 'today') return day.getTime() === today.getTime()
    if (range === 'week') return day >= today && day <= addDays(today, 6)
    if (range === 'month') return day >= today && day <= addDays(today, 29)
    if (range === 'overdue') return i.kind !== 'event' && day < today // só prazos; eventos passados não são "vencidos"
    return true
  })
}

export function groupByDay(items) {
  const groups = []
  const index = new Map()
  items.forEach((i) => {
    const key = dayKey(i.start)
    if (!index.has(key)) { const g = { key, date: startOfDay(i.start), items: [] }; index.set(key, g); groups.push(g) }
    index.get(key).items.push(i)
  })
  return groups
}

export function itemsByDay(items) {
  const map = {}
  items.forEach((i) => { (map[dayKey(i.start)] ??= []).push(i) })
  return map
}

// Semanas completas que cobrem o mês de `ref`. weekStartDay: 0 = domingo, 1 = segunda-feira.
export function monthWeeks(ref, weekStartDay = 0) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const start = addDays(first, -((first.getDay() - weekStartDay + 7) % 7))
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const weeks = []
  for (let d = start; d <= last || d.getDay() !== weekStartDay; d = addDays(d, 1)) {
    if (d.getDay() === weekStartDay) weeks.push([])
    weeks[weeks.length - 1].push(d)
  }
  return weeks
}

const hm = (d) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
export function whenLabel(item) {
  if (item.allDay) return item.kind === 'event' ? 'Dia inteiro' : 'Prazo do dia'
  if (!item.end) return hm(item.start)
  return startOfDay(item.end).getTime() === startOfDay(item.start).getTime() ? `${hm(item.start)}–${hm(item.end)}` : `${hm(item.start)} → ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(item.end)} ${hm(item.end)}`
}
export const dayHeading = (date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
