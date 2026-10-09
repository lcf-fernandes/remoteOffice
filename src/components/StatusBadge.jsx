// Códigos internos em inglês, rótulos em português (guia, seção 2).
const MAP = {
  // tarefa
  backlog: ['Backlog', 'neutral'], todo: ['A fazer', 'info'], in_progress: ['Em andamento', 'info'],
  waiting: ['Aguardando', 'warn'], done: ['Concluída', 'ok'], cancelled: ['Cancelada', 'neutral'],
  // projeto
  planning: ['Planejamento', 'neutral'], active: ['Ativo', 'info'], waiting_client: ['Aguardando cliente', 'warn'],
  review: ['Em revisão', 'info'], completed: ['Concluído', 'ok'], archived: ['Arquivado', 'neutral'],
  // proposta
  draft: ['Rascunho', 'neutral'], sent: ['Enviada', 'info'], negotiation: ['Em negociação', 'warn'],
  accepted: ['Aceita', 'ok'], rejected: ['Recusada', 'danger'], expired: ['Expirada', 'neutral'],
  // transação
  planned: ['Prevista', 'neutral'], pending: ['Pendente', 'warn'], paid: ['Paga', 'ok'], overdue: ['Vencida', 'danger'],
}

export default function StatusBadge({ status }) {
  const [label, tone] = MAP[status] ?? [status, 'neutral']
  return <span className={`badge badge--${tone}`}>{label}</span>
}
