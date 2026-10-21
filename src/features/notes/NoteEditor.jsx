import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Textarea } from '../../components/Field.jsx'
import LinkFields from './LinkFields.jsx'
import UnsavedDialog from './UnsavedDialog.jsx'
import useUnsavedWarning from './useUnsavedWarning.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createNote, deleteNote, notesErrorMessage, updateNote } from '../../services/notes.js'
import { validateNote } from '../../utils/notes.js'
import { parseTags } from '../../utils/tasks.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useNoteEditor = () => useContext(EditorContext)

const EMPTY = { title: '', content: '', tags: '', clientId: '', projectId: '', taskId: '' }
const fromNote = (n) => ({ title: n.title, content: n.content, tags: n.tags.join(', '), clientId: n.clientId ?? '', projectId: n.projectId ?? '', taskId: n.taskId ?? '' })

export default function NoteEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, note: null, initial: null, key: 0 })
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, note: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((note) => setState((s) => ({ open: true, note, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <NoteFormDialog key={state.key} open={state.open} note={state.note} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function NoteFormDialog({ open, note, initial, onClose }) {
  const { user } = useAuth()
  const start = note ? fromNote(note) : { ...EMPTY, ...(initial ?? {}) }
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
  const onCancel = (e) => { if (dirty) { e.preventDefault(); setConfirmDiscard(true) } } // Esc

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateNote(values)
    setErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    setSaving(true)
    const data = { ...values, tags: parseTags(values.tags) }
    try {
      if (note) await updateNote(user.uid, note.id, data)
      else await createNote(user.uid, data)
      onClose()
    } catch (err) { setSubmitError(notesErrorMessage(err)); setSaving(false) } // o texto permanece na tela
  }

  async function onDelete() {
    setDeleting(true)
    try { await deleteNote(user.uid, note.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(notesErrorMessage(err)); setDeleting(false) }
  }

  return (
    <>
      <Dialog
        open={open}
        wide
        title={note ? 'Editar nota' : 'Nova nota'}
        onClose={onClose}
        onCancel={onCancel}
        actions={
          <>
            {note && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
            <Button variant="ghost" onClick={requestClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="note-form" variant="primary" loading={saving}>Salvar</Button>
          </>
        }
      >
        <form id="note-form" className="form" onSubmit={onSubmit} noValidate>
          <Input label="Título (opcional)" value={values.title} onChange={set('title')} error={errors.title} />
          <Textarea label="Conteúdo" rows={8} value={values.content} onChange={set('content')} error={errors.content} autoFocus />
          <Input label="Tags (separadas por vírgula)" value={values.tags} onChange={set('tags')} error={errors.tags} />
          <LinkFields values={values} onChange={set} />
          {dirty && <p className="card__hint" role="status">Alterações ainda não salvas.</p>}
          {submitError && <p className="field__error" role="alert">{submitError}</p>}
        </form>
      </Dialog>
      <UnsavedDialog open={confirmDiscard} onKeep={() => setConfirmDiscard(false)} onDiscard={() => { setConfirmDiscard(false); onClose() }} />
      <Dialog open={confirmDelete} title="Excluir nota?" onClose={() => setConfirmDelete(false)}
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button><Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button></>}>
        <p>“{note?.title || 'Esta nota'}” será excluída para sempre.</p>
      </Dialog>
    </>
  )
}
