import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import UnsavedDialog from '../notes/UnsavedDialog.jsx'
import useUnsavedWarning from '../notes/useUnsavedWarning.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createTemplate, deleteTemplate, templateErrorMessage, updateTemplate } from '../../services/templates.js'
import { PROJECT_TYPE_OPTIONS } from '../../utils/projects.js'
import { MAX_OFFSET_DAYS, MAX_TEMPLATE_TASKS, hasErrors, normalizeTemplateTasks, tasksToForm, validateTemplate } from '../../utils/templates.js'
import { PRIORITY_OPTIONS } from '../../utils/tasks.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useTemplateEditor = () => useContext(EditorContext)

const newTask = () => ({ title: '', description: '', priority: 'medium', offsetDays: '', category: '' })
const blank = () => ({ name: '', description: '', projectType: 'development', tasks: [newTask()] })
const fromTemplate = (t) => ({ name: t.name, description: t.description, projectType: t.projectType, tasks: tasksToForm(t.tasks) })

export default function TemplateEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, template: null, initial: null, key: 0 })
  const openNew = useCallback(() => setState((s) => ({ open: true, template: null, initial: null, key: s.key + 1 })), [])
  const openEdit = useCallback((template) => setState((s) => ({ open: true, template, initial: null, key: s.key + 1 })), [])
  // Duplica um modelo (padrão ou próprio) como um NOVO modelo próprio, para editar.
  const duplicate = useCallback((template) => setState((s) => ({ open: true, template: null, initial: { ...fromTemplate(template), name: `${template.name} (cópia)` }, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit, duplicate }), [openNew, openEdit, duplicate])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <TemplateFormDialog key={state.key} open={state.open} template={state.template} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function TemplateFormDialog({ open, template, initial, onClose }) {
  const { user } = useAuth()
  const start = template ? fromTemplate(template) : initial ?? blank()
  const [startJson] = useState(() => JSON.stringify(start))
  const [values, setValues] = useState(start)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dirty = open && JSON.stringify(values) !== startJson
  useUnsavedWarning(dirty)
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))
  const setTask = (i, f) => (e) => setValues((v) => ({ ...v, tasks: v.tasks.map((t, j) => (j === i ? { ...t, [f]: e.target.value } : t)) }))
  const move = (i, d) => setValues((v) => { const t = [...v.tasks]; const j = i + d; if (j < 0 || j >= t.length) return v; [t[i], t[j]] = [t[j], t[i]]; return { ...v, tasks: t } })
  const removeTask = (i) => setValues((v) => ({ ...v, tasks: v.tasks.filter((_, j) => j !== i) }))
  const addTask = () => setValues((v) => (v.tasks.length >= MAX_TEMPLATE_TASKS ? v : { ...v, tasks: [...v.tasks, newTask()] }))
  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose())
  const onCancel = (e) => { if (dirty) { e.preventDefault(); setConfirmDiscard(true) } }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateTemplate(values)
    setErrors(found)
    if (hasErrors(found)) { focusFirstInvalid(e.currentTarget); return }
    setSaving(true)
    const data = { ...values, tasks: normalizeTemplateTasks(values.tasks) }
    try {
      if (template) await updateTemplate(user.uid, template.id, data)
      else await createTemplate(user.uid, data)
      onClose()
    } catch (err) { setSubmitError(templateErrorMessage(err)); setSaving(false) }
  }
  async function onDelete() {
    setDeleting(true)
    try { await deleteTemplate(user.uid, template.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(templateErrorMessage(err)); setDeleting(false) }
  }

  return (
    <>
      <Dialog open={open} wide title={template ? 'Editar modelo' : 'Novo modelo'} onClose={onClose} onCancel={onCancel}
        actions={<>
          {template && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
          <Button variant="ghost" onClick={requestClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="template-form" variant="primary" loading={saving}>Salvar</Button>
        </>}>
        <form id="template-form" className="form" onSubmit={onSubmit} noValidate>
          <Input label="Nome do modelo" value={values.name} onChange={set('name')} error={errors.name} autoFocus />
          <div className="form__row">
            <Select label="Tipo de projeto" value={values.projectType} onChange={set('projectType')} options={PROJECT_TYPE_OPTIONS} error={errors.projectType} />
            <span />
          </div>
          <Textarea label="Descrição (opcional)" rows={2} value={values.description} onChange={set('description')} error={errors.description} />
          <fieldset className="tpl__tasks">
            <legend className="field__label">Tarefas ({values.tasks.length} de {MAX_TEMPLATE_TASKS})</legend>
            {errors.tasks && <p className="field__error" role="alert">{errors.tasks}</p>}
            <p className="card__hint">O prazo de cada tarefa = início do projeto + “dias após o início” (vazio = sem prazo).</p>
            {values.tasks.map((t, i) => {
              const te = errors.taskErrors?.[i] ?? {}
              return (
                <div key={i} className="tpl__row">
                  <Input label={`Tarefa ${i + 1}`} value={t.title} onChange={setTask(i, 'title')} error={te.title} />
                  <div className="form__row">
                    <Select label="Prioridade" value={t.priority} onChange={setTask(i, 'priority')} options={PRIORITY_OPTIONS} error={te.priority} />
                    <Input label={`Dias após o início (0–${MAX_OFFSET_DAYS})`} type="number" min="0" max={MAX_OFFSET_DAYS} step="1" value={t.offsetDays} onChange={setTask(i, 'offsetDays')} error={te.offsetDays} />
                  </div>
                  <Input label="Categoria (opcional)" value={t.category} onChange={setTask(i, 'category')} error={te.category} />
                  <div className="actions">
                    <Button variant="ghost" icon={ArrowUp} aria-label={`Subir tarefa ${i + 1}`} onClick={() => move(i, -1)} disabled={i === 0} />
                    <Button variant="ghost" icon={ArrowDown} aria-label={`Descer tarefa ${i + 1}`} onClick={() => move(i, 1)} disabled={i === values.tasks.length - 1} />
                    <Button variant="ghost" icon={Trash2} aria-label={`Remover tarefa ${i + 1}`} onClick={() => removeTask(i)} />
                  </div>
                </div>
              )
            })}
            <Button icon={Plus} onClick={addTask} disabled={values.tasks.length >= MAX_TEMPLATE_TASKS}>Adicionar tarefa</Button>
          </fieldset>
          {dirty && <p className="card__hint" role="status">Alterações ainda não salvas.</p>}
          {submitError && <p className="field__error" role="alert">{submitError}</p>}
        </form>
      </Dialog>
      <UnsavedDialog open={confirmDiscard} onKeep={() => setConfirmDiscard(false)} onDiscard={() => { setConfirmDiscard(false); onClose() }} />
      <Dialog open={confirmDelete} title="Excluir modelo?" onClose={() => setConfirmDelete(false)}
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button><Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button></>}>
        <p>“{template?.name}” será excluído. Projetos e tarefas já criados a partir dele <strong>não são afetados</strong>.</p>
      </Dialog>
    </>
  )
}
