// Commit 19 — alertas internos. São DERIVADOS dos dados a cada renderização (nada é gravado nem enviado):
// cada condição gera no máximo UM alerta, com chave estável `${tipo}:${id}`; duplicados são descartados pela chave.
// Resolver a condição faz o alerta desaparecer sozinho. Não há envio de mensagens nem ações automáticas.
import { daysBetween, followUpReason } from './proposals.js'
import { effectiveStatus } from './finance.js'
import { isOpen } from './tasks.js'
import { isOpenProject } from './projects.js'

export const DEFAULT_DUE_SOON_DAYS = 2
export const DUE_SOON_OPTIONS = [1, 2, 3, 7]

export const ALERT_TYPES = [
  { id: 'task_overdue', label: 'Tarefa atrasada', severity: 'danger', action: 'Concluir ou reagendar', rule: 'Tarefa aberta com prazo anterior a hoje.' },
  { id: 'task_due_soon', label: 'Tarefa com prazo próximo', severity: 'warn', action: 'Abrir a tarefa', rule: 'Tarefa aberta com prazo de hoje até o limite configurado (dias à frente).' },
  { id: 'project_overdue', label: 'Projeto atrasado', severity: 'danger', action: 'Revisar prazo e status', rule: 'Projeto em andamento com prazo final anterior a hoje.' },
  { id: 'project_due_soon', label: 'Projeto com prazo próximo', severity: 'warn', action: 'Abrir o projeto', rule: 'Projeto em andamento com prazo final de hoje até o limite configurado.' },
  { id: 'project_blocked', label: 'Projeto aguardando cliente', severity: 'warn', action: 'Cobrar o retorno ou atualizar o status', rule: 'Projeto no status "Aguardando cliente" e sem alerta de prazo (o prazo tem prioridade, para o mesmo projeto não aparecer duas vezes).' },
  { id: 'follow_up', label: 'Proposta pede retorno', severity: 'warn', action: 'Registrar contato ou atualizar o status', rule: 'Próxima ação vencida ou de hoje, validade vencida ou sem retorno há N dias (prazo configurável em Propostas).' },
  { id: 'payment_overdue', label: 'Lançamento vencido', severity: 'danger', action: 'Marcar como pago ou reagendar', rule: 'Lançamento Pendente com vencimento anterior a hoje.' },
]
export const ALERT_TYPE_IDS = ALERT_TYPES.map((a) => a.id)
const META = Object.fromEntries(ALERT_TYPES.map((a) => [a.id, a]))
const SEVERITY_RANK = { danger: 0, warn: 1, info: 2 }

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export function buildAlerts({ tasks = [], projects = [], proposals = [], transactions = [], now = new Date(), settings = {} } = {}) {
  const { dueSoonDays = DEFAULT_DUE_SOON_DAYS, followUpDays = 7, disabled = [] } = settings
  const out = new Map() // chave estável → alerta (garante um único alerta por condição)
  const add = (type, id, title, detail, href, sortDate) => {
    if (disabled.includes(type)) return
    const key = `${type}:${id}`
    if (!out.has(key)) out.set(key, { key, type, severity: META[type].severity, label: META[type].label, action: META[type].action, title, detail, href, sortDate })
  }

  tasks.filter((x) => isOpen(x) && x.due).forEach((x) => {
    const d = daysBetween(now, x.due)
    if (d < 0) add('task_overdue', x.id, x.title, `Prazo vencido há ${plural(-d, 'dia', 'dias')}`, `#/tarefas/${x.id}`, x.due)
    else if (d <= dueSoonDays) add('task_due_soon', x.id, x.title, d === 0 ? 'Prazo é hoje' : `Prazo em ${plural(d, 'dia', 'dias')}`, `#/tarefas/${x.id}`, x.due)
  })
  projects.filter(isOpenProject).forEach((p) => {
    const d = p.dueDate ? daysBetween(now, p.dueDate) : null
    const deadlineCondition = d !== null && d <= dueSoonDays // vale mesmo se o tipo de alerta de prazo estiver desligado
    if (d !== null && d < 0) add('project_overdue', p.id, p.name, `Prazo vencido há ${plural(-d, 'dia', 'dias')}`, `#/projetos/${p.id}`, p.dueDate)
    else if (deadlineCondition) add('project_due_soon', p.id, p.name, d === 0 ? 'Prazo é hoje' : `Prazo em ${plural(d, 'dia', 'dias')}`, `#/projetos/${p.id}`, p.dueDate)
    else if (p.status === 'waiting_client') add('project_blocked', p.id, p.name, 'Aguardando retorno do cliente', `#/projetos/${p.id}`, p.dueDate ?? p.updatedAt ?? now)
  })
  proposals.forEach((p) => {
    const reason = followUpReason(p, { days: followUpDays, now })
    if (reason) add('follow_up', p.id, p.title, reason.text, `#/comercial/${p.id}`, p.nextActionDate ?? p.lastActivityAt ?? p.createdAt ?? now)
  })
  transactions.filter((x) => effectiveStatus(x, now) === 'overdue').forEach((x) =>
    add('payment_overdue', x.id, x.description, `${x.type === 'income' ? 'A receber' : 'A pagar'} · venceu há ${plural(-daysBetween(now, x.dueDate), 'dia', 'dias')}`, `#/financeiro/${x.id}`, x.dueDate))

  return [...out.values()].sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.sortDate.getTime() - b.sortDate.getTime() || a.key.localeCompare(b.key))
}

export function countByType(alerts) {
  const counts = {}
  alerts.forEach((a) => { counts[a.type] = (counts[a.type] ?? 0) + 1 })
  return counts
}
