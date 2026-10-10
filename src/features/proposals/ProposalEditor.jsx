import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select, Textarea } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { createProposal, proposalErrorMessage, updateProposal } from '../../services/proposals.js'
import { sortClients } from '../../utils/clients.js'
import { CURRENCY_OPTIONS, NEW_PROPOSAL_STATUS_OPTIONS, parseAmount, validateProposal } from '../../utils/proposals.js'
import { dateToInput, inputToDate } from '../../utils/tasks.js'

const EditorContext = createContext(null)
export const useProposalEditor = () => useContext(EditorContext)

const blank = (currency) => ({ title: '', summary: '', clientId: '', amount: '', currency, sentDate: '', validUntil: '', status: 'draft', nextAction: '', nextActionDate: '' })
const fromProposal = (p) => ({
  title: p.title, summary: p.summary, clientId: p.clientId ?? '', amount: String(p.amount), currency: p.currency,
  sentDate: dateToInput(p.sentDate), validUntil: dateToInput(p.validUntil), status: p.status,
  nextAction: p.nextAction, nextActionDate: dateToInput(p.nextActionDate),
})

export default function ProposalEditorProvider({ children }) {
  const [state, setState] = useState({ open: false, proposal: null, initial: null, key: 0 })
  const openNew = useCallback((initial = null) => setState((s) => ({ open: true, proposal: null, initial, key: s.key + 1 })), [])
  const openEdit = useCallback((proposal) => setState((s) => ({ open: true, proposal, initial: null, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  return (
    <EditorContext.Provider value={value}>
      {children}
      <ProposalFormDialog key={state.key} open={state.open} proposal={state.proposal} initial={state.initial} onClose={close} />
    </EditorContext.Provider>
  )
}

function ProposalFormDialog({ open, proposal, initial, onClose }) {
  const { user, profile } = useAuth()
  const { clients } = useClients()
  const defaultCurrency = CURRENCY_OPTIONS.some((o) => o.value === profile?.preferences?.currency) ? profile.preferences.currency : 'BRL'
  const [values, setValues] = useState(proposal ? fromProposal(proposal) : { ...blank(defaultCurrency), ...(initial ?? {}) })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))
  const selectable = sortClients(clients.filter((c) => c.status !== 'archived' || c.id === values.clientId))
  const clientOptions = [{ value: '', label: selectable.length ? 'Escolha o cliente…' : 'Nenhum cliente cadastrado' }, ...selectable.map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))]

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validateProposal(values, { creating: !proposal })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const data = {
      ...values, amount: parseAmount(values.amount),
      sentDate: inputToDate(values.sentDate), validUntil: inputToDate(values.validUntil), nextActionDate: inputToDate(values.nextActionDate),
    }
    try {
      if (proposal) await updateProposal(user.uid, proposal.id, data)
      else await createProposal(user.uid, data)
      onClose()
    } catch (err) {
      setSubmitError(proposalErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      wide
      title={proposal ? 'Editar proposta' : 'Nova proposta'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="proposal-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="proposal-form" className="form" onSubmit={onSubmit} noValidate>
        <Input label="Título" value={values.title} onChange={set('title')} error={errors.title} autoFocus required />
        <Select label="Cliente" value={values.clientId} onChange={set('clientId')} options={clientOptions} error={errors.clientId} />
        {selectable.length === 0 && <p className="card__hint">Cadastre o cliente em Clientes antes de criar a proposta.</p>}
        <Textarea label="Resumo (opcional)" value={values.summary} onChange={set('summary')} error={errors.summary} />
        <div className="form__row">
          <Input label="Valor estimado" type="number" inputMode="decimal" min="0" step="any" value={values.amount} onChange={set('amount')} error={errors.amount} />
          <Select label="Moeda" value={values.currency} onChange={set('currency')} options={CURRENCY_OPTIONS} error={errors.currency} />
        </div>
        <div className="form__row">
          <Input label="Data de envio (opcional)" type="date" value={values.sentDate} onChange={set('sentDate')} error={errors.sentDate} />
          <Input label="Validade (opcional)" type="date" value={values.validUntil} onChange={set('validUntil')} error={errors.validUntil} />
        </div>
        {!proposal && <Select label="Status inicial" value={values.status} onChange={set('status')} options={NEW_PROPOSAL_STATUS_OPTIONS} error={errors.status} />}
        {proposal && <p className="card__hint">O status muda na página da proposta, onde fica registrado no histórico.</p>}
        <div className="form__row">
          <Input label="Próxima ação (opcional)" value={values.nextAction} onChange={set('nextAction')} error={errors.nextAction} />
          <Input label="Data da próxima ação" type="date" value={values.nextActionDate} onChange={set('nextActionDate')} error={errors.nextActionDate} />
        </div>
        {submitError && <p className="field__error" role="alert">{submitError}</p>}
      </form>
    </Dialog>
  )
}
