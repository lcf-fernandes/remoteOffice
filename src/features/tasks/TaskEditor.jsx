import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { createTask, taskErrorMessage, updateTask } from '../../services/tasks.js'
import { sortClients } from '../../utils/clients.js'
import { PRIORITY_OPTIONS, STATUS_OPTIONS, dateToInput, inputToDate, parseTags, validateTask } from '../../utils/tasks.js'

const EditorContext = createContext(null)
export const useTaskEditor = () => useContext(EditorContext)

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', due: '', category: '', tags: '', clientId: '' }
const fromTask = (t) => ({
  title: t.title, description: t.description, status: t.status, priority: t.priority,
  due: dateToInput(t.due), category: t.category, tags: t.tags.join(', '), clientId: t.clientId ?? '',
})

// Provider global: qualquer tela (ou o botão "Criar") abre o mesmo formulário.
export default function TaskEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, task: null, initial: null, key: 0 })
  // initial (opcional): valores pré-preenchidos, ex.: { clientId }
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, task: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((task) => setState((s) => ({ open: true, task, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])

  return (
    <EditorContext.Provider value={value}>
      {children}
      <TaskFormDialog key={state.key} open={state.open} task={state.task} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function TaskFormDialog({ open, task, initial, onClose }) {
  const { user } = useAuth()
  const { clients } = useClients()
  const [values, setValues] = useState(task ? fromTask(task) : { ...EMPTY, ...(initial ?? {}) })
  const clientOptions = [
    { value: '', label: 'Sem cliente' },
    ...sortClients(clients.filter((c) => c.status !== 'archived' || c.id === values.clientId)).map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
  ]
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateTask(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const data = { ...values, due: inputToDate(values.due), tags: parseTags(values.tags) }
    try {
      if (task) await updateTask(user.uid, task.id, data)
      else await createTask(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(taskErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      wide
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="task-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="task-form" className="form" onSubmit={onSubmit} noValidate>
        <Input label="Título" value={values.title} onChange={set('title')} error={errors.title} autoFocus required />
        <Textarea label="Descrição (opcional)" value={values.description} onChange={set('description')} error={errors.description} />
        <div className="form__row">
          <Select label="Status" value={values.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Select label="Prioridade" value={values.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
        </div>
        <div className="form__row">
          <Input label="Prazo (opcional)" type="date" value={values.due} onChange={set('due')} error={errors.due} />
          <Input label="Categoria (opcional)" value={values.category} onChange={set('category')} error={errors.category} />
        </div>
        <Select label="Cliente (opcional)" value={values.clientId} onChange={set('clientId')} options={clientOptions} />
        <Input label="Tags (separadas por vírgula)" value={values.tags} onChange={set('tags')} error={errors.tags} />
        {submitError && <p className="field__error" role="alert">{submitError}</p>}
      </form>
    </Dialog>
  )
}
