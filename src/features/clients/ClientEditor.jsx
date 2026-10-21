import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { clientErrorMessage, createClient, updateClient } from '../../services/clients.js'
import { CLIENT_STATUS_OPTIONS, SOURCE_SUGGESTIONS, validateClient } from '../../utils/clients.js'
import { dateToInput, inputToDate } from '../../utils/tasks.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useClientEditor = () => useContext(EditorContext)

const EMPTY = { name: '', company: '', email: '', phone: '', source: '', status: 'lead', notes: '', nextAction: '', nextActionDate: '' }
const fromClient = (c) => ({ ...c, nextActionDate: dateToInput(c.nextActionDate) })

export default function ClientEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, client: null, key: 0 })
  const openNew = useCallback(() => setState((s) => ({ open: true, client: null, key: s.key + 1 })), [])
  const openEdit = useCallback((client) => setState((s) => ({ open: true, client, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <ClientFormDialog key={state.key} open={state.open} client={state.client} onClose={close} />
    </EditorContext.Provider>
  )
}

function ClientFormDialog({ open, client, onClose }) {
  const { user } = useAuth()
  const [values, setValues] = useState(client ? fromClient(client) : EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateClient(values)
    setErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    setSaving(true)
    const data = { ...values, nextActionDate: inputToDate(values.nextActionDate) }
    try {
      if (client) await updateClient(user.uid, client.id, data)
      else await createClient(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(clientErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      wide
      title={client ? 'Editar cliente' : 'Novo cliente'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="client-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="client-form" className="form" onSubmit={onSubmit} noValidate>
        <Input label="Nome" value={values.name} onChange={set('name')} error={errors.name} autoFocus required />
        <div className="form__row">
          <Input label="Empresa (opcional)" value={values.company} onChange={set('company')} error={errors.company} />
          <Select label="Status" value={values.status} onChange={set('status')} options={CLIENT_STATUS_OPTIONS} />
        </div>
        <div className="form__row">
          <Input label="E-mail (opcional)" type="email" value={values.email} onChange={set('email')} error={errors.email} />
          <Input label="Telefone (opcional)" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
        </div>
        <Input label="Origem (opcional)" list="client-sources" value={values.source} onChange={set('source')} error={errors.source} />
        <datalist id="client-sources">{SOURCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="form__row">
          <Input label="Próxima ação (opcional)" value={values.nextAction} onChange={set('nextAction')} error={errors.nextAction} />
          <Input label="Data da próxima ação" type="date" value={values.nextActionDate} onChange={set('nextActionDate')} error={errors.nextActionDate} />
        </div>
        <Textarea label="Observações (opcional)" value={values.notes} onChange={set('notes')} error={errors.notes} />
        {submitError && <p className="field__error" role="alert">{submitError}</p>}
      </form>
    </Dialog>
  )
}
