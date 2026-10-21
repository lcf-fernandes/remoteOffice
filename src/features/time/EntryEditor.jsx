import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Checkbox, Input, Select } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTime } from './TimeProvider.jsx'
import { createManualEntry, deleteEntry, subscribeToRevisions, timeErrorMessage, updateEntry } from '../../services/time.js'
import { dateTimeToInput, inputToDateTime } from '../../utils/events.js'
import { findOverlaps, formatDuration, validateEntry } from '../../utils/time.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useEntryEditor = () => useContext(EditorContext)

const blank = () => { const n = new Date(); n.setSeconds(0, 0); const s = new Date(n.getTime() - 3600000); return { description: '', taskId: '', projectId: '', start: dateTimeToInput(s), end: dateTimeToInput(n), billable: false } }
const fromEntry = (e) => ({ description: e.description, taskId: e.taskId ?? '', projectId: e.projectId ?? '', start: dateTimeToInput(e.start), end: dateTimeToInput(e.end), billable: e.billable })
const hm = (d) => (d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d) : '—')

export default function EntryEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, entry: null, key: 0 })
  const openNew = useCallback(() => setState((s) => ({ open: true, entry: null, key: s.key + 1 })), [])
  const openEdit = useCallback((entry) => setState((s) => ({ open: true, entry, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <EntryFormDialog key={state.key} open={state.open} entry={state.entry} onClose={close} />
    </EditorContext.Provider>
  )
}

function EntryFormDialog({ open, entry, onClose }) {
  const { user } = useAuth()
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { entries } = useTime()
  const [values, setValues] = useState(entry ? fromEntry(entry) : blank())
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [revisions, setRevisions] = useState([])
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  useEffect(() => {
    if (!entry || !open) return undefined
    return subscribeToRevisions(user.uid, entry.id, setRevisions, () => setRevisions([]))
  }, [entry, open, user.uid])

  const taskOptions = [{ value: '', label: 'Sem tarefa' }, ...[...tasks].filter((t) => t.status !== 'cancelled' || t.id === values.taskId).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')).map((t) => ({ value: t.id, label: t.title }))]
  const selectedTask = tasks.find((t) => t.id === values.taskId)
  const projectOptions = [{ value: '', label: 'Sem projeto' }, ...[...projects].filter((p) => !['archived', 'completed'].includes(p.status) || p.id === values.projectId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name }))]

  const start = values.start ? inputToDateTime(values.start) : null
  const end = values.end ? inputToDateTime(values.end) : null
  const overlaps = start && end && end > start ? findOverlaps(entries, start, end, entry?.id) : []

  function onTask(e) {
    const taskId = e.target.value
    const t = tasks.find((x) => x.id === taskId)
    setValues((v) => ({ ...v, taskId, projectId: t ? t.projectId ?? '' : v.projectId }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateEntry(values)
    setErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    const data = { ...values, start, end }
    if (entry && entry.start.getTime() === start.getTime() && entry.end.getTime() === end.getTime() && entry.description === values.description.trim()
      && (entry.taskId ?? '') === values.taskId && (entry.projectId ?? '') === values.projectId && entry.billable === values.billable) return onClose()
    setSaving(true)
    try {
      if (entry) await updateEntry(user.uid, entry, data)
      else await createManualEntry(user.uid, data)
      onClose()
    } catch (err) { setSubmitError(timeErrorMessage(err)); setSaving(false) }
  }

  async function onDelete() {
    setDeleting(true)
    try { await deleteEntry(user.uid, entry.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(timeErrorMessage(err)); setDeleting(false) }
  }

  return (
    <>
      <Dialog
        open={open}
        wide
        title={entry ? 'Ajustar registro de tempo' : 'Novo registro manual'}
        onClose={onClose}
        actions={
          <>
            {entry && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="entry-form" variant="primary" loading={saving}>Salvar</Button>
          </>
        }
      >
        <form id="entry-form" className="form" onSubmit={onSubmit} noValidate>
          <Input label="Descrição (opcional)" value={values.description} onChange={set('description')} error={errors.description} autoFocus />
          <div className="form__row">
            <Input label="Início" type="datetime-local" value={values.start} onChange={set('start')} error={errors.start} />
            <Input label="Fim" type="datetime-local" value={values.end} onChange={set('end')} error={errors.end} />
          </div>
          {start && end && end > start && <p className="card__hint">Duração: <strong>{formatDuration((end - start) / 1000)}</strong> (máximo de 24 h por registro).</p>}
          {overlaps.length > 0 && <p className="field__error" role="status">Atenção: este intervalo se sobrepõe a {overlaps.length} {overlaps.length === 1 ? 'outro registro' : 'outros registros'}; o tempo será contado em duplicidade nos relatórios.</p>}
          <div className="form__row">
            <Select label="Tarefa (opcional)" value={values.taskId} onChange={onTask} options={taskOptions} />
            <Select label="Projeto (opcional)" value={values.projectId} onChange={set('projectId')} options={projectOptions} disabled={!!selectedTask?.projectId} />
          </div>
          {selectedTask?.projectId && <p className="card__hint">O projeto vem da tarefa escolhida.</p>}
          <Checkbox label="Marcar como faturável (apenas uma marcação: não gera cobrança nem valor)" checked={values.billable} onChange={(e) => setValues((v) => ({ ...v, billable: e.target.checked }))} />
          {submitError && <p className="field__error" role="alert">{submitError}</p>}
        </form>
        {entry && (
          <div>
            <h3 className="card__title" style={{ fontSize: 'var(--fs-md)' }}>Histórico de ajustes</h3>
            {revisions.length === 0 ? <p className="row__meta">Este registro nunca foi ajustado.</p> : (
              <ul className="rows">
                {revisions.map((r) => (
                  <li key={r.id} className="row">
                    <p className="row__meta">Antes do ajuste de {hm(r.at)}: {hm(r.before.start)} → {hm(r.before.end)} · {formatDuration(r.before.durationSeconds)}{r.before.description ? ` · ${r.before.description}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Dialog>
      <Dialog
        open={confirmDelete}
        title="Excluir registro?"
        onClose={() => setConfirmDelete(false)}
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button><Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button></>}
      >
        <p>Este registro e o histórico de ajustes serão excluídos para sempre e o tempo sairá dos relatórios.</p>
      </Dialog>
    </>
  )
}
