// Commit 11 — constantes e lógica pura de clientes.
import { daysFromToday } from './format.js'
import { inputToDate } from './tasks.js'

export const CLIENT_STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'archived', label: 'Arquivado' },
]
export const SOURCE_SUGGESTIONS = ['Indicação', 'Site', 'Redes sociais', 'Marketplace', 'Contato direto', 'Outro']

export const INTERACTION_TYPES = [
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'message', label: 'Mensagem' },
  { value: 'other', label: 'Outro' },
]
export const INTERACTION_LABEL = Object.fromEntries(INTERACTION_TYPES.map((o) => [o.value, o.label]))

export const CLIENT_VIEWS = [
  { id: 'current', label: 'Em andamento' }, // lead + ativo + inativo (tudo menos arquivados)
  { id: 'lead', label: 'Leads' },
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Inativos' },
  { id: 'archived', label: 'Arquivados' },
  { id: 'all', label: 'Todos' },
]

export function filterClients(clients, { view = 'current', search = '' } = {}) {
  const q = search.trim().toLowerCase()
  return clients.filter((c) => {
    if (view === 'current' && c.status === 'archived') return false
    if (['lead', 'active', 'inactive', 'archived'].includes(view) && c.status !== view) return false
    if (q && ![c.name, c.company, c.email, c.phone, c.source, c.notes, c.nextAction].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}

export const sortClients = (clients) => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

export const nextActionIsLate = (c) => c.status !== 'archived' && !!c.nextActionDate && daysFromToday(c.nextActionDate) < 0

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[0-9+()\-.\s]{6,30}$/

export function validateClient(v) {
  const e = {}
  const name = v.name.trim()
  if (!name) e.name = 'Informe o nome.'
  else if (name.length > 120) e.name = 'O nome deve ter no máximo 120 caracteres.'
  if (v.company.length > 120) e.company = 'A empresa deve ter no máximo 120 caracteres.'
  if (v.email.trim() && !EMAIL.test(v.email.trim())) e.email = 'Digite um e-mail válido.'
  if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = 'Telefone inválido. Use números, +, parênteses e traços.'
  if (v.source.length > 60) e.source = 'A origem deve ter no máximo 60 caracteres.'
  if (v.notes.length > 5000) e.notes = 'As observações devem ter no máximo 5000 caracteres.'
  if (v.nextAction.length > 200) e.nextAction = 'A próxima ação deve ter no máximo 200 caracteres.'
  if (v.nextActionDate && inputToDate(v.nextActionDate) === undefined) e.nextActionDate = 'Data inválida.'
  return e
}

export function validateInteraction(v) {
  const e = {}
  if (!v.date || inputToDate(v.date) === undefined) e.date = 'Informe uma data válida.'
  const summary = v.summary.trim()
  if (!summary) e.summary = 'Descreva o que aconteceu.'
  else if (summary.length > 2000) e.summary = 'O resumo deve ter no máximo 2000 caracteres.'
  return e
}

// Link de e-mail só para endereços simples (sem ?, &, # ou espaços que poderiam injetar cabeçalhos como bcc/subject).
export const safeMailto = (email) => (/^[^\s@?&#<>"']+@[^\s@?&#<>"']+\.[^\s@?&#<>"']+$/.test(email ?? '') ? `mailto:${email}` : null)
