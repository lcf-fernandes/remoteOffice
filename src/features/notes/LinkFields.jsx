import { Select } from '../../components/Field.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { sortClients } from '../../utils/clients.js'
import { isOpen } from '../../utils/tasks.js'

// Vínculos opcionais (cliente, projeto, tarefa). Itens arquivados/concluídos só aparecem se já estiverem vinculados.
export default function LinkFields({ values, onChange }) {
  const { clients } = useClients()
  const { projects } = useProjects()
  const { tasks } = useTasks()
  const clientOptions = [{ value: '', label: 'Sem cliente' }, ...sortClients(clients.filter((c) => c.status !== 'archived' || c.id === values.clientId)).map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))]
  const projectOptions = [{ value: '', label: 'Sem projeto' }, ...[...projects].filter((p) => !['archived', 'completed'].includes(p.status) || p.id === values.projectId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name }))]
  const taskOptions = [{ value: '', label: 'Sem tarefa' }, ...[...tasks].filter((t) => isOpen(t) || t.id === values.taskId).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')).map((t) => ({ value: t.id, label: t.title }))]
  return (
    <>
      <div className="form__row">
        <Select label="Cliente (opcional)" value={values.clientId} onChange={onChange('clientId')} options={clientOptions} />
        <Select label="Projeto (opcional)" value={values.projectId} onChange={onChange('projectId')} options={projectOptions} />
      </div>
      <Select label="Tarefa (opcional)" value={values.taskId} onChange={onChange('taskId')} options={taskOptions} />
    </>
  )
}
