import { useState } from 'react'
import Button from '../components/Button.jsx'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import useUnsavedWarning from '../features/notes/useUnsavedWarning.js'
import { createNote, notesErrorMessage } from '../services/notes.js'
import { NOTE_MAX } from '../utils/notes.js'

// Captura rápida pela lateral. Se salvar falhar, o texto permanece na caixa e o erro é mostrado.
export default function QuickNote() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useUnsavedWarning(text.trim().length > 0)

  async function save() {
    const content = text.trim()
    if (!content) return setError('Escreva algo antes de salvar.')
    if (content.length > NOTE_MAX) return setError(`A nota deve ter no máximo ${NOTE_MAX} caracteres.`)
    setSaving(true); setError(''); setSaved(false)
    try { await createNote(user.uid, { title: '', content, tags: [] }); setText(''); setSaved(true) }
    catch (err) { setError(notesErrorMessage(err)) }
    setSaving(false)
  }

  return (
    <div className="left__note">
      <label className="sr-only" htmlFor="quick-note">Nota rápida</label>
      <textarea id="quick-note" value={text} placeholder="Anote uma ideia…" onChange={(e) => { setText(e.target.value); setSaved(false) }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save() }} />
      {error && <p className="left__err" role="alert">{error}</p>}
      {saved && <p className="left__muted" role="status">Nota salva.</p>}
      <Button onClick={save} loading={saving}>Salvar nota</Button>
      <a className="left__link2" href="#/notas">Ver todas as notas</a>
    </div>
  )
}
