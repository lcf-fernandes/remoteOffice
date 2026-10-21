import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '../components/Button.jsx'
import { QUICK_ACTIONS } from './nav.js'
import { usePreferences } from '../features/preferences/PreferencesProvider.jsx'
import { orderQuickActions } from '../utils/contexts.js'
import { useTaskEditor } from '../features/tasks/TaskEditor.jsx'
import { useClientEditor } from '../features/clients/ClientEditor.jsx'
import { useProjectEditor } from '../features/projects/ProjectEditor.jsx'
import { useEventEditor } from '../features/events/EventEditor.jsx'
import { useProposalEditor } from '../features/proposals/ProposalEditor.jsx'
import { useTransactionEditor } from '../features/finance/TransactionEditor.jsx'
import { useEntryEditor } from '../features/time/EntryEditor.jsx'
import { useNoteEditor } from '../features/notes/NoteEditor.jsx'
import { useWorkLogEditor } from '../features/notes/WorkLogEditor.jsx'

// Menu "Criar": botão que expande uma lista de ações (padrão de "disclosure", sem role="menu": não promete navegação por setas).
// Esc fecha e devolve o foco ao botão; sair do menu com Tab também fecha; ao escolher, o foco volta ao botão antes de abrir o formulário
// (assim, ao fechar o formulário, o foco retorna ao "Criar").
export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const trigger = useRef(null)
  const taskEditor = useTaskEditor()
  const clientEditor = useClientEditor()
  const projectEditor = useProjectEditor()
  const eventEditor = useEventEditor()
  const { prefs } = usePreferences()
  const proposalEditor = useProposalEditor()
  const txEditor = useTransactionEditor()
  const entryEditor = useEntryEditor()
  const noteEditor = useNoteEditor()
  const logEditor = useWorkLogEditor()

  const handlers = {
    tarefa: () => taskEditor.openNew(), cliente: () => clientEditor.openNew(), projeto: () => projectEditor.openNew(), evento: () => eventEditor.openNew(),
    proposta: () => proposalEditor.openNew(), receita: () => txEditor.openNew({ type: 'income' }), despesa: () => txEditor.openNew({ type: 'expense' }),
    tempo: () => entryEditor.openNew(), nota: () => noteEditor.openNew(), registro: () => logEditor.openNew(),
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    const onClick = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  const choose = (id) => { setOpen(false); trigger.current?.focus(); handlers[id]?.() }

  return (
    <div ref={wrap} style={{ position: 'relative' }} onBlur={(e) => { if (open && !wrap.current.contains(e.relatedTarget)) setOpen(false) }}>
      <Button ref={trigger} variant="primary" icon={Plus} aria-expanded={open} aria-controls="quick-add-list" onClick={() => setOpen((v) => !v)}>
        Criar
      </Button>
      {open && (
        <ul id="quick-add-list" className="menu" aria-label="Criar novo registro" style={{ top: 'calc(100% + 4px)', left: 0 }}>
          {orderQuickActions(QUICK_ACTIONS, prefs.context).map((a) => (
            <li key={a.id}><button type="button" className="menu__item" onClick={() => choose(a.id)}>{a.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  )
}
