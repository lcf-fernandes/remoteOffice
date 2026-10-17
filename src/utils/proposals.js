// Commit 14 — constantes e lógica pura do módulo comercial.
import { startOfDay } from './agenda.js'
import { inputToDate } from './tasks.js'

export const PROPOSAL_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviada' },
  { value: 'negotiation', label: 'Em negociação' },
  { value: 'accepted', label: 'Aceita' },
  { value: 'rejected', label: 'Recusada' },
  { value: 'expired', label: 'Expirada' },
]
export const PROPOSAL_STATUS_LABEL = Object.fromEntries(PROPOSAL_STATUS_OPTIONS.map((o) => [o.value, o.label]))
// Ao criar, só estes: aceitar passa pelo fluxo de confirmação do detalhe (e fica no histórico).
export const NEW_PROPOSAL_STATUS_OPTIONS = PROPOSAL_STATUS_OPTIONS.filter((o) => ['draft', 'sent', 'negotiation'].includes(o.value))

export const OPEN_PROPOSAL = ['draft', 'sent', 'negotiation']
export const AWAITING = ['sent', 'negotiation'] // aguardando resposta do cliente
export const isOpenProposal = (p) => OPEN_PROPOSAL.includes(p.status)

export const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'PYG', label: 'Guarani (PYG)' },
]
export const CURRENCIES = CURRENCY_OPTIONS.map((o) => o.value)

export const PROPOSAL_VIEWS = [
  { id: 'open', label: 'Em aberto' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'negotiation', label: 'Em negociação' },
  { id: 'accepted', label: 'Aceitas' },
  { id: 'rejected', label: 'Recusadas' },
  { id: 'expired', label: 'Expiradas' },
  { id: 'all', label: 'Todas' },
]

export function filterProposals(proposals, { view = 'open', search = '' } = {}, clientsById = {}) {
  const q = search.trim().toLowerCase()
  return proposals.filter((p) => {
    if (view === 'open' && !isOpenProposal(p)) return false
    if (!['open', 'all'].includes(view) && p.status !== view) return false
    if (q && ![p.title, p.summary, p.nextAction, clientsById[p.clientId]?.name ?? ''].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}

// Próxima ação mais próxima primeiro (sem data por último), depois título.
export const sortProposals = (list) =>
  [...list].sort((a, b) => (a.nextActionDate?.getTime() ?? Infinity) - (b.nextActionDate?.getTime() ?? Infinity) || a.title.localeCompare(b.title, 'pt-BR'))

// ---- Regra de follow-up (configurável e exibida na tela) -----------------------------------
export const FOLLOW_UP_DAY_OPTIONS = [3, 7, 14, 30]
export const DEFAULT_FOLLOW_UP_DAYS = 7
export const followUpRuleText = (days) =>
  `Uma proposta pede retorno quando: (1) a próxima ação está vencida ou é hoje; (2) a validade venceu e ela ainda está Enviada/Em negociação; ou (3) está Enviada/Em negociação sem mudança de status nem contato registrado há ${days} ${days === 1 ? 'dia' : 'dias'} ou mais.`

export const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / 86400000)

export function followUpReason(p, { days = DEFAULT_FOLLOW_UP_DAYS, now = new Date() } = {}) {
  if (!isOpenProposal(p)) return null
  if (p.nextActionDate) {
    const d = daysBetween(now, p.nextActionDate)
    if (d < 0) return { kind: 'next_action', text: `Próxima ação vencida há ${-d} ${-d === 1 ? 'dia' : 'dias'}` }
    if (d === 0) return { kind: 'next_action', text: 'Próxima ação é hoje' }
  }
  if (!AWAITING.includes(p.status)) return null
  if (p.validUntil && daysBetween(now, p.validUntil) < 0) return { kind: 'validity', text: 'Validade vencida — considere marcar como expirada' }
  const last = p.lastActivityAt ?? p.createdAt
  if (last) {
    const idle = daysBetween(last, now)
    if (idle >= days) return { kind: 'no_reply', text: `Sem retorno há ${idle} ${idle === 1 ? 'dia' : 'dias'}` }
  }
  return null
}

// Soma por moeda (nunca mistura moedas). Considera propostas aguardando resposta.
export function pipelineTotals(proposals) {
  const totals = {}
  proposals.filter((p) => AWAITING.includes(p.status)).forEach((p) => { totals[p.currency] = (totals[p.currency] ?? 0) + p.amount })
  return totals
}

// ---- Dinheiro: sempre número + código da moeda (nunca texto formatado) ----------------------
export const currencyDigits = (currency) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
// Arredonda para as casas da moeda pelo valor DECIMAL digitado (1.005 → 1.01), e não pelo binário (1.005 * 100 = 100.4999…).
export function roundMoney(amount, currency) {
  const d = currencyDigits(currency)
  const abs = Math.abs(amount)
  if (!Number.isFinite(amount) || abs >= 1e15 || (abs !== 0 && abs < 1e-6)) return Math.round(amount * 10 ** d) / 10 ** d // fora da faixa de dinheiro real
  const shifted = Math.round(Number(`${Number(abs.toPrecision(15))}e${d}`))
  return (amount < 0 ? -1 : 1) * Number(`${shifted}e-${d}`)
}
export const parseAmount = (text) => (String(text).trim() === '' ? NaN : Number(text))

export function validateProposal(v, { creating = true } = {}) {
  const e = {}
  const title = v.title.trim()
  if (!title) e.title = 'Informe o título.'
  else if (title.length > 160) e.title = 'O título deve ter no máximo 160 caracteres.'
  if (v.summary.length > 5000) e.summary = 'O resumo deve ter no máximo 5000 caracteres.'
  if (!v.clientId) e.clientId = 'Escolha o cliente.'
  const amount = parseAmount(v.amount)
  if (!Number.isFinite(amount)) e.amount = 'Informe o valor estimado.'
  else if (amount < 0) e.amount = 'O valor não pode ser negativo.'
  else if (amount > 1e12) e.amount = 'Valor alto demais.'
  if (!CURRENCIES.includes(v.currency)) e.currency = 'Escolha a moeda.'
  if (creating && !NEW_PROPOSAL_STATUS_OPTIONS.some((o) => o.value === v.status)) e.status = 'Status inválido.'
  const sent = v.sentDate ? inputToDate(v.sentDate) : null
  const valid = v.validUntil ? inputToDate(v.validUntil) : null
  const next = v.nextActionDate ? inputToDate(v.nextActionDate) : null
  if (sent === undefined) e.sentDate = 'Data inválida.'
  if (valid === undefined) e.validUntil = 'Data inválida.'
  if (sent && valid && valid < sent) e.validUntil = 'A validade não pode ser antes do envio.'
  if (next === undefined) e.nextActionDate = 'Data inválida.'
  if (v.nextAction.length > 200) e.nextAction = 'A próxima ação deve ter no máximo 200 caracteres.'
  return e
}
