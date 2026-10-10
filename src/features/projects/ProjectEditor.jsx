import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { createProject, projectErrorMessage, updateProject } from '../../services/projects.js'
import { sortClients } from '../../utils/clients.js'
import { PROJECT_STATUS_OPTIONS, PROJECT_TYPE_OPTIONS, parseLinks, validateProject } from '../../utils/projects.js'
import { PRIORITY_OPTIONS, dateToInput, inputToDate } from '../../utils/tasks.js'

const EditorContext = createContext(null)
export const useProjectEditor = () => useContext(EditorContext)

const EMPTY = { name: '', description: '', clientId: '', type: 'development', status: 'planning', priority: 'medium', startDate: '', dueDate: '', links: '' }
const fromProject = (p) => ({
  name: p.name, description: p.description, clientId: p.clientId ?? '', type: p.type, status: p.status, priority: p.priority,
  startDate: dateToInput(p.startDate), dueDate: dateToInput(p.dueDate), links: p.links.join('\n'),
})

export default function ProjectEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, project: null, initial: null, key: 0 })
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, project: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((project) => setState((s) => ({ open: true, project, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <ProjectFormDialog key={state.key} open={state.open} project={state.project} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function ProjectFormDialog({ open, project, initial, onClose }) {
  const { user } = useAuth()
  const { clients } = useClients()
  const [values, setValues] = useState(project ? fromProject(project) : { ...EMPTY, ...(initial ?? {}) })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))
  const clientOptions = [
    { value: '', label: 'Sem cliente (projeto interno ou pessoal)' },
    ...sortClients(clients.filter((c) => c.status !== 'archived' || c.id === values.clientId)).map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
  ]

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateProject(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const data = { ...values, startDate: inputToDate(values.startDate), dueDate: inputToDate(values.dueDate), links: parseLinks(values.links) }
    try {
      if (project) await updateProject(user.uid, project.id, data)
      else await createProject(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(projectErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      wide
      title={project ? 'Editar projeto' : 'Novo projeto'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="project-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={onSubmit} noValidate>
        <Input label="Nome" value={values.name} onChange={set('name')} error={errors.name} autoFocus required />
        <Textarea label="Descrição (opcional)" value={values.description} onChange={set('description')} error={errors.description} />
        <Select label="Cliente (opcional)" value={values.clientId} onChange={set('clientId')} options={clientOptions} />
        <div className="form__row">
          <Select label="Tipo" value={values.type} onChange={set('type')} options={PROJECT_TYPE_OPTIONS} />
          <Select label="Status" value={values.status} onChange={set('status')} options={PROJECT_STATUS_OPTIONS} />
        </div>
        <div className="form__row">
          <Select label="Prioridade" value={values.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <span />
        </div>
        <div className="form__row">
          <Input label="Início (opcional)" type="date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
          <Input label="Prazo final (opcional)" type="date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
        </div>
        <Textarea label="Links de referência (um por linha, com https://)" rows={3} value={values.links} onChange={set('links')} error={errors.links} />
        {submitError && <p className="field__error" role="alert">{submitError}</p>}
      </form>
    </Dialog>
  )
}
