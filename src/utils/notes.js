// Commit 17 — lógica pura de notas e registro de trabalho (diário de bordo).
import { startOfDay } from './agenda.js'
import { inputToDate, parseTags } from './tasks.js'

export const NOTE_MAX = 10000
export const LOG_FIELD_MAX = 5000

export function validateNote(v) {
  const e = {}
  if (v.title.length > 160) e.title = 'O título deve ter no máximo 160 caracteres.'
  const content = v.content.trim()
  if (!content) e.content = 'Escreva o conteúdo da nota.'
  else if (content.length > NOTE_MAX) e.content = `A nota deve ter no máximo ${NOTE_MAX} caracteres.`
  const tags = parseTags(v.tags)
  if (tags.length > 20) e.tags = 'Use no máximo 20 tags.'
  else if (tags.some((t) => t.length > 30)) e.tags = 'Cada tag deve ter no máximo 30 caracteres.'
  return e
}

export function validateWorkLog(v) {
  const e = {}
  if (!v.date || inputToDate(v.date) === undefined) e.date = 'Informe uma data válida.'
  const parts = [v.done, v.blockers, v.nextStep].map((s) => s.trim())
  if (parts.every((s) => !s)) e.done = 'Preencha ao menos um dos campos: feito, bloqueios ou próximo passo.'
  if (v.done.length > LOG_FIELD_MAX) e.done = `Cada campo pode ter no máximo ${LOG_FIELD_MAX} caracteres.`
  if (v.blockers.length > LOG_FIELD_MAX) e.blockers = `Cada campo pode ter no máximo ${LOG_FIELD_MAX} caracteres.`
  if (v.nextStep.length > LOG_FIELD_MAX) e.nextStep = `Cada campo pode ter no máximo ${LOG_FIELD_MAX} caracteres.`
  return e
}

// Título da nota; sem título, usa a primeira linha do conteúdo.
export const noteHeading = (n) => n.title.trim() || n.content.trim().split('\n')[0].slice(0, 80) || 'Nota sem título'
export const snippet = (text, max = 140) => { const t = text.trim().replace(/\s+/g, ' '); return t.length > max ? `${t.slice(0, max)}…` : t }
export const allTags = (notes) => [...new Set(notes.flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Intervalo de datas inclusivo (yyyy-mm-dd). Campo vazio = sem limite.
function inRange(date, from, to) {
  if (!from && !to) return true
  if (!date) return false
  const d = startOfDay(date).getTime()
  const f = from ? inputToDate(from) : null
  const t = to ? inputToDate(to) : null
  if (f && d < startOfDay(f).getTime()) return false
  if (t && d > startOfDay(t).getTime()) return false
  return true
}

export function filterNotes(notes, { search = '', tag = '', from = '', to = '' } = {}) {
  const q = search.trim().toLowerCase()
  return notes.filter((n) => {
    if (tag && !n.tags.includes(tag)) return false
    if (!inRange(n.createdAt ?? new Date(), from, to)) return false
    if (q && ![n.title, n.content, ...n.tags].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}
export const sortNotes = (notes) => [...notes].sort((a, b) => (b.updatedAt ?? b.createdAt ?? new Date()) - (a.updatedAt ?? a.createdAt ?? new Date()))

export function filterWorkLog(entries, { search = '', from = '', to = '', projectId = '' } = {}) {
  const q = search.trim().toLowerCase()
  return entries.filter((e) => {
    if (projectId && e.projectId !== projectId) return false
    if (!inRange(e.date, from, to)) return false
    if (q && ![e.done, e.blockers, e.nextStep].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}
// Data do registro (mais recente primeiro); empate pelo momento da criação.
export const sortWorkLog = (entries) => [...entries].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) || (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity))
