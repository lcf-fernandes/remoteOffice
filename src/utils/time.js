// Commit 16 — lógica pura de registro de tempo.
//
// REGRAS (documentadas em docs/DECISIONS.md):
// - Duração = fim − início, calculada a partir de timestamps; nunca de um contador em memória.
// - Um registro tem no máximo 24 h. Cronômetro esquecido deve ter o fim ajustado ao parar.
// - "Tempo registrado" NÃO é "tempo faturável": faturável é só uma marcação manual e não gera cobrança.
import { addDays, dayKey, startOfDay } from './agenda.js'
import { inputToDateTime } from './events.js'

export const MAX_ENTRY_SECONDS = 24 * 3600
export const STALE_TIMER_SECONDS = 8 * 3600 // avisa que o cronômetro está ativo há muito tempo

export const durationSeconds = (start, end) => Math.round((end.getTime() - start.getTime()) / 1000)

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}
// Relógio do cronômetro ativo (HH:MM:SS)
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

export function validateEntry(v, { now = new Date() } = {}) {
  const e = {}
  const start = v.start ? inputToDateTime(v.start) : null
  const end = v.end ? inputToDateTime(v.end) : null
  if (!v.start) e.start = 'Informe o início.'
  else if (start === undefined) e.start = 'Data ou horário inválido.'
  if (!v.end) e.end = 'Informe o fim.'
  else if (end === undefined) e.end = 'Data ou horário inválido.'
  if (start && end) {
    if (end <= start) e.end = 'O fim deve ser depois do início.'
    else if (durationSeconds(start, end) > MAX_ENTRY_SECONDS) e.end = 'Um registro pode ter no máximo 24 horas. Divida em dois registros.'
    else if (end.getTime() > now.getTime() + 60000) e.end = 'O fim não pode estar no futuro.'
  }
  if (v.description.length > 200) e.description = 'A descrição deve ter no máximo 200 caracteres.'
  return e
}

// Registros que se sobrepõem ao intervalo (duplicariam o tempo nos relatórios). Só avisa; não bloqueia.
export const findOverlaps = (entries, start, end, ignoreId = null) =>
  entries.filter((e) => e.id !== ignoreId && e.start < end && e.end > start)

export const TIME_PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Últimos 7 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'all', label: 'Tudo' },
]

// O registro pertence ao dia/mês em que COMEÇOU (um registro que cruza a meia-noite não é dividido).
export function inTimePeriod(date, period, now = new Date()) {
  if (period === 'all') return true
  const d = startOfDay(date).getTime()
  const today = startOfDay(now)
  const y = now.getFullYear(), m = now.getMonth()
  if (period === 'today') return d === today.getTime()
  if (period === 'week') return d >= addDays(today, -6).getTime() && d <= today.getTime()
  if (period === 'month') return d >= new Date(y, m, 1).getTime() && d < new Date(y, m + 1, 1).getTime()
  if (period === 'last_month') return d >= new Date(y, m - 1, 1).getTime() && d < new Date(y, m, 1).getTime()
  return true
}
export const filterEntries = (entries, period, now = new Date()) => entries.filter((e) => inTimePeriod(e.start, period, now))

export const totals = (entries) => ({
  seconds: entries.reduce((a, e) => a + e.durationSeconds, 0),
  billableSeconds: entries.filter((e) => e.billable).reduce((a, e) => a + e.durationSeconds, 0),
  count: entries.length,
})

// Projeto efetivo: o atual da tarefa (se ela existe) ou o gravado no registro.
export const entryProjectId = (e, tasksById) => (e.taskId && tasksById[e.taskId] ? tasksById[e.taskId].projectId ?? null : e.projectId ?? null)

function group(entries, keyOf, labelOf, sortRows) {
  const map = new Map()
  entries.forEach((e) => {
    const key = keyOf(e)
    if (!map.has(key)) map.set(key, { key, label: labelOf(key, e), seconds: 0, billableSeconds: 0, count: 0 })
    const row = map.get(key)
    row.seconds += e.durationSeconds
    row.count += 1
    if (e.billable) row.billableSeconds += e.durationSeconds
  })
  return [...map.values()].sort(sortRows)
}
const bySeconds = (a, b) => b.seconds - a.seconds || a.label.localeCompare(b.label, 'pt-BR')

export function buildReport(entries, kind, { tasksById = {}, projectsById = {} } = {}) {
  if (kind === 'day') {
    return group(entries, (e) => dayKey(e.start), (k, e) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(startOfDay(e.start)), (a, b) => (a.key < b.key ? 1 : -1))
  }
  if (kind === 'task') {
    return group(entries, (e) => e.taskId ?? 'none', (k) => (k === 'none' ? 'Sem tarefa' : tasksById[k]?.title ?? '(tarefa excluída)'), bySeconds)
  }
  if (kind === 'project') {
    return group(entries, (e) => entryProjectId(e, tasksById) ?? 'none', (k) => (k === 'none' ? 'Sem projeto' : projectsById[k]?.name ?? '(projeto excluído)'), bySeconds)
  }
  return group(entries, (e) => (e.taskId && tasksById[e.taskId]?.category) || 'none', (k) => (k === 'none' ? 'Sem categoria' : k), bySeconds)
}
