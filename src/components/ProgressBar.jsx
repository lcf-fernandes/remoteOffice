import { EMPTY_PROGRESS, PROGRESS_RULE } from '../utils/projects.js'

// Mostra o progresso e o critério (a regra fica visível via title e texto de apoio).
export default function ProgressBar({ progress = EMPTY_PROGRESS, label }) {
  const { done, total, percent } = progress
  return (
    <div className="progress-wrap" title={PROGRESS_RULE}>
      <div className="progress" role="progressbar" aria-label={label ?? 'Progresso'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? 0}>
        <span style={{ width: `${percent ?? 0}%` }} />
      </div>
      <p className="row__meta">{total ? `${done} de ${total} ${total === 1 ? 'tarefa' : 'tarefas'} (${percent}%)` : 'Sem tarefas ainda'}</p>
    </div>
  )
}
