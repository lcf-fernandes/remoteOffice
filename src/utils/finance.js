// Commit 15 — lógica pura do controle financeiro. Só registra e acompanha: não processa pagamentos.
import { addDays, startOfDay } from './agenda.js'
import { CURRENCIES, roundMoney } from './proposals.js'
import { inputToDate } from './tasks.js'

export const TX_TYPE_OPTIONS = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
]
export const TX_TYPE_LABEL = Object.fromEntries(TX_TYPE_OPTIONS.map((o) => [o.value, o.label]))

// Status GRAVADO. "Vencido" não é gravado: é calculado (ver OVERDUE_RULE).
export const TX_STATUS_OPTIONS = [
  { value: 'planned', label: 'Prevista' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Paga / recebida' },
  { value: 'cancelled', label: 'Cancelada' },
]
export const TX_FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'planned', label: 'Prevista' },
  { value: 'pending', label: 'Pendente (no prazo)' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'paid', label: 'Paga / recebida' },
  { value: 'cancelled', label: 'Cancelada' },
]

export const CATEGORY_SUGGESTIONS = ['Projeto', 'Manutenção', 'Consultoria', 'Edição de vídeo', 'Ferramentas', 'Hospedagem', 'Impostos', 'Equipamento', 'Marketing', 'Outros']

export const STATUS_RULES = {
  planned: 'Prevista: estimativa ainda não confirmada. Não é dinheiro recebido nem cobrança em aberto e nunca fica vencida.',
  pending: 'Pendente: cobrança ou conta confirmada, aguardando pagamento.',
  overdue: 'Vencida: lançamento Pendente cujo vencimento é anterior a hoje (no dia do vencimento ainda está no prazo).',
  paid: 'Paga / recebida: pagamento já ocorrido, com data de pagamento. Só este status conta como dinheiro efetivamente movimentado.',
  cancelled: 'Cancelada: mantida no histórico, mas ignorada em todos os totais.',
}
export const OVERDUE_RULE = STATUS_RULES.overdue

// Status efetivo: "overdue" é derivado, nunca gravado.
export function effectiveStatus(t, now = new Date()) {
  if (t.status === 'pending' && t.dueDate && startOfDay(t.dueDate) < startOfDay(now)) return 'overdue'
  return t.status
}

// Data de referência para período: pagos contam no mês do pagamento; os demais, no do vencimento.
export const referenceDate = (t) => (t.status === 'paid' && t.paidDate ? t.paidDate : t.dueDate)

export const PERIOD_OPTIONS = [
  { id: 'month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'next_30', label: 'Próximos 30 dias' },
  { id: 'year', label: 'Este ano' },
  { id: 'all', label: 'Tudo' },
]
export const PERIOD_RULE = 'O período usa a data do pagamento para lançamentos pagos e a data de vencimento para os demais.'

export function inPeriod(date, period, now = new Date()) {
  if (period === 'all') return true
  if (!date) return false
  const d = startOfDay(date).getTime()
  const y = now.getFullYear(), m = now.getMonth()
  if (period === 'month') return d >= new Date(y, m, 1).getTime() && d < new Date(y, m + 1, 1).getTime()
  if (period === 'last_month') return d >= new Date(y, m - 1, 1).getTime() && d < new Date(y, m, 1).getTime()
  if (period === 'next_30') { const t = startOfDay(now); return d >= t.getTime() && d <= addDays(t, 29).getTime() }
  if (period === 'year') return d >= new Date(y, 0, 1).getTime() && d < new Date(y + 1, 0, 1).getTime()
  return true
}

export function filterTransactions(txs, { period = 'month', status = '', type = '', currency = '', search = '' } = {}, now = new Date()) {
  const q = search.trim().toLowerCase()
  return txs.filter((t) => {
    if (!inPeriod(referenceDate(t), period, now)) return false
    if (status && effectiveStatus(t, now) !== status) return false
    if (type && t.type !== type) return false
    if (currency && t.currency !== currency) return false
    if (q && ![t.description, t.category, t.notes].join(' ').toLowerCase().includes(q)) return false
    return true
  })
}

// Em aberto (previstas/pendentes) primeiro, por vencimento crescente; depois pagas/canceladas, mais recentes primeiro.
export function sortTransactions(txs) {
  const open = (t) => t.status === 'planned' || t.status === 'pending'
  return [...txs].sort((a, b) => {
    if (open(a) !== open(b)) return open(a) ? -1 : 1
    const da = referenceDate(a)?.getTime() ?? 0, db = referenceDate(b)?.getTime() ?? 0
    return open(a) ? da - db : db - da
  })
}

const emptyBucket = () => ({ paid: 0, pending: 0, overdue: 0, planned: 0 })

// Totais SEPARADOS por moeda (nunca somam moedas). Canceladas são ignoradas.
// Saldo realizado = recebido − pago (somente o que já foi pago); previstos/pendentes não entram.
export function summarize(txs, now = new Date()) {
  const byCurrency = {}
  txs.forEach((t) => {
    if (t.status === 'cancelled') return
    const bucket = (byCurrency[t.currency] ??= { income: emptyBucket(), expense: emptyBucket() })
    bucket[t.type][effectiveStatus(t, now)] += t.amount
  })
  Object.entries(byCurrency).forEach(([cur, b]) => {
    for (const type of ['income', 'expense']) for (const k of Object.keys(b[type])) b[type][k] = roundMoney(b[type][k], cur)
    b.balance = roundMoney(b.income.paid - b.expense.paid, cur)
  })
  return byCurrency
}

export const overdueTransactions = (txs, now = new Date()) => txs.filter((t) => effectiveStatus(t, now) === 'overdue')

export function validateTransaction(v) {
  const e = {}
  const description = v.description.trim()
  if (!description) e.description = 'Informe a descrição.'
  else if (description.length > 160) e.description = 'A descrição deve ter no máximo 160 caracteres.'
  if (!TX_TYPE_LABEL[v.type]) e.type = 'Escolha receita ou despesa.'
  const amount = String(v.amount).trim() === '' ? NaN : Number(v.amount)
  if (!Number.isFinite(amount)) e.amount = 'Informe o valor.'
  else if (amount <= 0) e.amount = 'O valor deve ser maior que zero.'
  else if (amount > 1e12) e.amount = 'Valor alto demais.'
  if (!CURRENCIES.includes(v.currency)) e.currency = 'Escolha a moeda.'
  if (!TX_STATUS_OPTIONS.some((o) => o.value === v.status)) e.status = 'Status inválido.'
  if (!v.dueDate) e.dueDate = 'Informe o vencimento.'
  else if (inputToDate(v.dueDate) === undefined) e.dueDate = 'Data inválida.'
  if (v.status === 'paid') {
    if (!v.paidDate) e.paidDate = 'Informe a data do pagamento.'
    else if (inputToDate(v.paidDate) === undefined) e.paidDate = 'Data inválida.'
  }
  if (v.category.length > 60) e.category = 'A categoria deve ter no máximo 60 caracteres.'
  if (v.notes.length > 5000) e.notes = 'As observações devem ter no máximo 5000 caracteres.'
  return e
}
