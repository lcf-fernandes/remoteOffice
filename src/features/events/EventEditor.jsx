import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Checkbox, Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { createEvent, deleteEvent, eventErrorMessage, updateEvent } from '../../services/events.js'
import { EVENT_TYPE_OPTIONS, REMINDER_OPTIONS, dateTimeToInput, localTimeZone, parseEventInput, validateEvent } from '../../utils/events.js'
import { dateToInput } from '../../utils/tasks.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useEventEditor = () => useContext(EditorContext)

const EMPTY = { title: '', type: 'meeting', allDay: false, start: '', end: '', description: '', projectId: '', reminder: '' }
const fromEvent = (e) => ({
  title: e.title, type: e.type, allDay: e.allDay,
  start: e.allDay ? dateToInput(e.start) : dateTimeToInput(e.start), end: e.allDay ? '' : dateTimeToInput(e.end),
  description: e.description, projectId: e.projectId ?? '', reminder: e.reminderMinutes === null ? '' : String(e.reminderMinutes),
})

export default function EventEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, event: null, initial: null, key: 0 })
  // initial (opcional): { start: 'YYYY-MM-DDTHH:mm' } para criar já em um dia/hora
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, event: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((event) => setState((s) => ({ open: true, event, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <EventFormDialog key={state.key} open={state.open} event={state.event} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function EventFormDialog({ open, event, initial, onClose }) {
  const { user } = useAuth()
  const { projects } = useProjects()
  const [values, setValues] = useState(event ? fromEvent(event) : { ...EMPTY, ...(initial ?? {}) })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))
  const projectOptions = [
    { value: '', label: 'Sem projeto' },
    ...[...projects].filter((p) => !['archived', 'completed'].includes(p.status) || p.id === values.projectId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name })),
  ]

  function toggleAllDay(e) {
    const allDay = e.target.checked
    setValues((v) => ({
      ...v, allDay, end: '',
      start: allDay ? v.start.slice(0, 10) : v.start ? `${v.start.slice(0, 10)}T09:00` : '',
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateEvent(values)
    setErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    setSaving(true)
    const data = { ...values, start: parseEventInput(values.start, values.allDay), end: values.allDay || !values.end ? null : parseEventInput(values.end, false) }
    try {
      if (event) await updateEvent(user.uid, event.id, data)
      else await createEvent(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(eventErrorMessage(err))
      setSaving(false)
    }
  }

  async function onDelete() {
    setDeleting(true)
    try { await deleteEvent(user.uid, event.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(eventErrorMessage(err)); setDeleting(false) }
  }

  const when = values.allDay ? 'date' : 'datetime-local'
  return (
    <>
    <Dialog
      open={open}
      wide
      title={event ? 'Editar evento' : 'Novo evento'}
      onClose={onClose}
      actions={
        <>
          {event && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="event-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="event-form" className="form" onSubmit={onSubmit} noValidate>
        <Input label="Título" value={values.title} onChange={set('title')} error={errors.title} autoFocus required />
        <div className="form__row">
          <Select label="Tipo" value={values.type} onChange={set('type')} options={EVENT_TYPE_OPTIONS} />
          <Select label="Projeto (opcional)" value={values.projectId} onChange={set('projectId')} options={projectOptions} />
        </div>
        <Checkbox label="Dia inteiro" checked={values.allDay} onChange={toggleAllDay} />
        <div className="form__row">
          <Input label="Início" type={when} value={values.start} onChange={set('start')} error={errors.start} />
          {!values.allDay && <Input label="Fim (opcional)" type="datetime-local" value={values.end} onChange={set('end')} error={errors.end} />}
        </div>
        <p className="card__hint">Horários no fuso do seu navegador ({localTimeZone()}).</p>
        <Select label="Lembrete" value={values.reminder} onChange={set('reminder')} options={REMINDER_OPTIONS} error={errors.reminder} />
        <p className="card__hint">Atenção: o app ainda não envia notificações. O lembrete escolhido fica apenas salvo no evento.</p>
        <Textarea label="Descrição (opcional)" value={values.description} onChange={set('description')} error={errors.description} />
        {submitError && <p className="field__error" role="alert">{submitError}</p>}
      </form>
    </Dialog>
    <Dialog
      open={confirmDelete}
      title="Excluir evento?"
      onClose={() => setConfirmDelete(false)}
      actions={
        <>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
          <Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button>
        </>
      }
    >
      <p>“{event?.title}” será excluído e não poderá ser recuperado.</p>
    </Dialog>
    </>
  )
}
