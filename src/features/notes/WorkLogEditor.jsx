import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Textarea } from '../../components/Field.jsx'
import LinkFields from './LinkFields.jsx'
import UnsavedDialog from './UnsavedDialog.jsx'
import useUnsavedWarning from './useUnsavedWarning.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createWorkLog, deleteWorkLog, notesErrorMessage, updateWorkLog } from '../../services/notes.js'
import { validateWorkLog } from '../../utils/notes.js'
import { dateToInput, inputToDate } from '../../utils/tasks.js'

const EditorContext = createContext(null)
export const useWorkLogEditor = () => useContext(EditorContext)

const blank = () => ({ date: dateToInput(new Date()), done: '', blockers: '', nextStep: '', clientId: '', projectId: '', taskId: '' })
const fromEntry = (e) => ({ date: dateToInput(e.date), done: e.done, blockers: e.blockers, nextStep: e.nextStep, clientId: e.clientId ?? '', projectId: e.projectId ?? '', taskId: e.taskId ?? '' })

export default function WorkLogEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, entry: null, initial: null, key: 0 })
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, entry: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((entry) => setState((s) => ({ open: true, entry, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <WorkLogFormDialog key={state.key} open={state.open} entry={state.entry} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function WorkLogFormDialog({ open, entry, initial, onClose }) {
  const { user } = useAuth()
  const start = entry ? fromEntry(entry) : { ...blank(), ...(initial ?? {}) }
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
  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose())
  const onCancel = (e) => { if (dirty) { e.preventDefault(); setConfirmDiscard(true) } }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateWorkLog(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const data = { ...values, date: inputToDate(values.date) }
    try {
      if (entry) await updateWorkLog(user.uid, entry.id, data)
      else await createWorkLog(user.uid, data)
      onClose()
    } catch (err) { setSubmitError(notesErrorMessage(err)); setSaving(false) }
  }
  async function onDelete() {
    setDeleting(true)
    try { await deleteWorkLog(user.uid, entry.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(notesErrorMessage(err)); setDeleting(false) }
  }

  return (
    <>
      <Dialog
        open={open}
        wide
        title={entry ? 'Editar registro de trabalho' : 'Novo registro de trabalho'}
        onClose={onClose}
        onCancel={onCancel}
        actions={
          <>
            {entry && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
            <Button variant="ghost" onClick={requestClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="worklog-form" variant="primary" loading={saving}>Salvar</Button>
          </>
        }
      >
        <form id="worklog-form" className="form" onSubmit={onSubmit} noValidate>
          <Input label="Data" type="date" value={values.date} onChange={set('date')} error={errors.date} />
          <Textarea label="O que fiz" rows={4} value={values.done} onChange={set('done')} error={errors.done} autoFocus />
          <Textarea label="Bloqueios" rows={3} value={values.blockers} onChange={set('blockers')} error={errors.blockers} />
          <Textarea label="Próximo passo" rows={3} value={values.nextStep} onChange={set('nextStep')} error={errors.nextStep} />
          <p className="card__hint">Preencha ao menos um dos três campos. Pense em quem vai retomar este trabalho depois de uma pausa: você.</p>
          <LinkFields values={values} onChange={set} />
          {dirty && <p className="card__hint" role="status">Alterações ainda não salvas.</p>}
          {submitError && <p className="field__error" role="alert">{submitError}</p>}
        </form>
      </Dialog>
      <UnsavedDialog open={confirmDiscard} onKeep={() => setConfirmDiscard(false)} onDiscard={() => { setConfirmDiscard(false); onClose() }} />
      <Dialog open={confirmDelete} title="Excluir registro?" onClose={() => setConfirmDelete(false)}
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button><Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button></>}>
        <p>Este registro de trabalho será excluído para sempre.</p>
      </Dialog>
    </>
  )
}
