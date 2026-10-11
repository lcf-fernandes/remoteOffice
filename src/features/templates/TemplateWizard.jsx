import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Checkbox, Input, Select } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useTemplates } from './TemplatesProvider.jsx'
import { createProjectFromPlan, templateErrorMessage } from '../../services/templates.js'
import { sortClients } from '../../utils/clients.js'
import { PROJECT_TYPE_OPTIONS } from '../../utils/projects.js'
import { buildProjectPlan, findTemplate, taskDueDate, validateWizard } from '../../utils/templates.js'
import { PRIORITY_LABEL, PRIORITY_OPTIONS, dateToInput, inputToDate } from '../../utils/tasks.js'
import { formatDate } from '../../utils/format.js'

const WizardContext = createContext(null)
export const useTemplateWizard = () => useContext(WizardContext)

export default function TemplateWizardProvider({ children }) {
  const [state, setState] = useState({ open: false, templateId: null, key: 0 })
  const open = useCallback((templateId = null) => setState((s) => ({ open: true, templateId, key: s.key + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ open }), [open])
  return (
    <WizardContext.Provider value={value}>
      {children}
      <WizardDialog key={state.key} open={state.open} templateId={state.templateId} onClose={close} />
    </WizardContext.Provider>
  )
}

const initialFor = (template) => ({ name: template?.name ?? '', description: template?.description ?? '', clientId: '', type: template?.projectType ?? 'other', priority: 'medium', startDate: dateToInput(new Date()), dueDate: '' })

function WizardDialog({ open, templateId, onClose }) {
  const { user } = useAuth()
  const { all } = useTemplates()
  const { clients } = useClients()
  const [tid, setTid] = useState(templateId ?? all[0]?.id ?? '')
  const template = findTemplate(all, tid)
  const [values, setValues] = useState(() => initialFor(findTemplate(all, templateId ?? all[0]?.id)))
  const [selected, setSelected] = useState(() => new Set((findTemplate(all, templateId ?? all[0]?.id)?.tasks ?? []).map((_, i) => i)))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  function chooseTemplate(id) {
    const next = findTemplate(all, id)
    setTid(id)
    setValues((v) => ({ ...v, name: !v.name || v.name === template?.name ? next?.name ?? '' : v.name, description: !v.description || v.description === template?.description ? next?.description ?? '' : v.description, type: next?.projectType ?? v.type }))
    setSelected(new Set((next?.tasks ?? []).map((_, i) => i)))
  }
  const toggle = (i, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(i); else n.delete(i); return n })

  const clientOptions = [{ value: '', label: 'Sem cliente' }, ...sortClients(clients.filter((c) => c.status !== 'archived')).map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))]
  const start = values.startDate ? inputToDate(values.startDate) : null
  const count = selected.size

  async function confirm() {
    setError('')
    const found = validateWizard(values)
    setErrors(found)
    if (Object.keys(found).length || !template || saving) return
    setSaving(true)
    try {
      const id = await createProjectFromPlan(user.uid, buildProjectPlan(template, [...selected], values))
      onClose()
      window.location.hash = `#/projetos/${id}`
    } catch (err) { setError(templateErrorMessage(err)); setSaving(false) }
  }

  return (
    <Dialog open={open} wide title="Novo projeto a partir de modelo" onClose={onClose}
      actions={<><Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="primary" onClick={confirm} loading={saving} disabled={!template}>{count ? `Criar projeto e ${count} ${count === 1 ? 'tarefa' : 'tarefas'}` : 'Criar projeto (sem tarefas)'}</Button></>}>
      <div className="form">
        <Select label="Modelo" value={tid} onChange={(e) => chooseTemplate(e.target.value)} options={all.map((t) => ({ value: t.id, label: `${t.name}${t.builtin ? ' (padrão)' : ''}` }))} />
        <Input label="Nome do projeto" value={values.name} onChange={set('name')} error={errors.name} />
        <div className="form__row">
          <Select label="Cliente (opcional)" value={values.clientId} onChange={set('clientId')} options={clientOptions} />
          <Select label="Tipo" value={values.type} onChange={set('type')} options={PROJECT_TYPE_OPTIONS} />
        </div>
        <div className="form__row">
          <Input label="Início (base dos prazos das tarefas)" type="date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
          <Input label="Prazo final do projeto (opcional)" type="date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
        </div>
        <Select label="Prioridade do projeto" value={values.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
        {!values.startDate && <p className="card__hint">Sem data de início, as tarefas serão criadas sem prazo.</p>}

        <fieldset className="wizard__list">
          <legend className="field__label">Tarefas que serão criadas ({count} de {template?.tasks.length ?? 0})</legend>
          <div className="actions">
            <Button variant="ghost" onClick={() => setSelected(new Set((template?.tasks ?? []).map((_, i) => i)))}>Marcar todas</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Desmarcar todas</Button>
          </div>
          <ul className="rows">
            {(template?.tasks ?? []).map((t, i) => {
              const due = taskDueDate(start, t.offsetDays ?? null)
              return (
                <li key={i} className="row">
                  <Checkbox label={t.title} checked={selected.has(i)} onChange={(e) => toggle(i, e.target.checked)} />
                  <span className="row__meta">{PRIORITY_LABEL[t.priority]} · {due ? formatDate(due) : 'sem prazo'}</span>
                </li>
              )
            })}
          </ul>
        </fieldset>
        <p className="card__hint"><strong>Nada é criado até você confirmar.</strong> Ao confirmar, serão criados 1 projeto e {count} {count === 1 ? 'tarefa' : 'tarefas'}, tudo de uma vez (se algo falhar, nada é gravado).</p>
        {error && <p className="field__error" role="alert">{error}</p>}
      </div>
    </Dialog>
  )
}
