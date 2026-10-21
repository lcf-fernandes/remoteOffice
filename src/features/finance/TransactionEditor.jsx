import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { usePreferences } from '../preferences/PreferencesProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { createTransaction, deleteTransaction, transactionErrorMessage, updateTransaction } from '../../services/transactions.js'
import { sortClients } from '../../utils/clients.js'
import { CATEGORY_SUGGESTIONS, STATUS_RULES, TX_STATUS_OPTIONS, TX_TYPE_OPTIONS, validateTransaction } from '../../utils/finance.js'
import { CURRENCY_OPTIONS } from '../../utils/proposals.js'
import { dateToInput, inputToDate } from '../../utils/tasks.js'
import { focusFirstInvalid } from '../../utils/focus.js'

const EditorContext = createContext(null)
export const useTransactionEditor = () => useContext(EditorContext)

const blank = (currency) => ({ description: '', type: 'income', amount: '', currency, status: 'pending', dueDate: '', paidDate: '', category: '', clientId: '', projectId: '', notes: '' })
const fromTx = (t) => ({
  description: t.description, type: t.type, amount: String(t.amount), currency: t.currency, status: t.status,
  dueDate: dateToInput(t.dueDate), paidDate: dateToInput(t.paidDate), category: t.category,
  clientId: t.clientId ?? '', projectId: t.projectId ?? '', notes: t.notes,
})

export default function TransactionEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, tx: null, initial: null, key: 0 })
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, tx: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((tx) => setState((s) => ({ open: true, tx, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <TransactionFormDialog key={state.key} open={state.open} tx={state.tx} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function TransactionFormDialog({ open, tx, initial, onClose }) {
  const { user } = useAuth()
  const { prefs } = usePreferences()
  const { clients } = useClients()
  const { projects } = useProjects()
  const defaultCurrency = prefs.currency
  const [values, setValues] = useState(tx ? fromTx(tx) : { ...blank(defaultCurrency), ...(initial ?? {}) })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  const clientOptions = [{ value: '', label: 'Sem cliente' }, ...sortClients(clients.filter((c) => c.status !== 'archived' || c.id === values.clientId)).map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))]
  const projectOptions = [{ value: '', label: 'Sem projeto' }, ...[...projects].filter((p) => !['archived', 'completed'].includes(p.status) || p.id === values.projectId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name }))]

  function onStatus(e) {
    const status = e.target.value
    // Ao marcar como paga, sugere hoje como data de pagamento (editável).
    setValues((v) => ({ ...v, status, paidDate: status === 'paid' && !v.paidDate ? dateToInput(new Date()) : v.paidDate }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateTransaction(values)
    setErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    setSaving(true)
    const data = { ...values, amount: Number(values.amount), dueDate: inputToDate(values.dueDate), paidDate: values.paidDate ? inputToDate(values.paidDate) : null }
    try {
      if (tx) await updateTransaction(user.uid, tx.id, data)
      else await createTransaction(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(transactionErrorMessage(err))
      setSaving(false)
    }
  }

  async function onDelete() {
    setDeleting(true)
    try { await deleteTransaction(user.uid, tx.id); setConfirmDelete(false); onClose() }
    catch (err) { setConfirmDelete(false); setSubmitError(transactionErrorMessage(err)); setDeleting(false) }
  }

  return (
    <>
      <Dialog
        open={open}
        wide
        title={tx ? 'Editar lançamento' : 'Novo lançamento'}
        onClose={onClose}
        actions={
          <>
            {tx && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={saving}>Excluir</Button>}
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="tx-form" variant="primary" loading={saving}>Salvar</Button>
          </>
        }
      >
        <form id="tx-form" className="form" onSubmit={onSubmit} noValidate>
          <Input label="Descrição" value={values.description} onChange={set('description')} error={errors.description} autoFocus required />
          <div className="form__row">
            <Select label="Tipo" value={values.type} onChange={set('type')} options={TX_TYPE_OPTIONS} error={errors.type} />
            <Select label="Status" value={values.status} onChange={onStatus} options={TX_STATUS_OPTIONS} error={errors.status} />
          </div>
          <p className="card__hint">{STATUS_RULES[values.status]}</p>
          <div className="form__row">
            <Input label="Valor" type="number" inputMode="decimal" min="0" step="any" value={values.amount} onChange={set('amount')} error={errors.amount} />
            <Select label="Moeda" value={values.currency} onChange={set('currency')} options={CURRENCY_OPTIONS} error={errors.currency} />
          </div>
          <div className="form__row">
            <Input label="Vencimento" type="date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
            {values.status === 'paid' ? <Input label="Data do pagamento" type="date" value={values.paidDate} onChange={set('paidDate')} error={errors.paidDate} /> : <span />}
          </div>
          <Input label="Categoria (opcional)" list="tx-categories" value={values.category} onChange={set('category')} error={errors.category} />
          <datalist id="tx-categories">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="form__row">
            <Select label="Cliente (opcional)" value={values.clientId} onChange={set('clientId')} options={clientOptions} />
            <Select label="Projeto (opcional)" value={values.projectId} onChange={set('projectId')} options={projectOptions} />
          </div>
          <Textarea label="Observações (opcional)" rows={3} value={values.notes} onChange={set('notes')} error={errors.notes} />
          {submitError && <p className="field__error" role="alert">{submitError}</p>}
        </form>
      </Dialog>
      <Dialog
        open={confirmDelete}
        title="Excluir lançamento?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="primary" onClick={onDelete} loading={deleting}>Excluir</Button>
          </>
        }
      >
        <p>“{tx?.description}” será excluído para sempre. Para preservar o histórico sem contar nos totais, mude o status para <strong>Cancelada</strong> em vez de excluir.</p>
      </Dialog>
    </>
  )
}
