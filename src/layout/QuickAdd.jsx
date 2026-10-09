import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '../components/Button.jsx'
import Dialog from '../components/Dialog.jsx'
import { QUICK_ACTIONS } from './nav.js'
import { useTaskEditor } from '../features/tasks/TaskEditor.jsx'

// Nenhum formulário existe ainda: a ação informa que está pendente em vez de fingir sucesso.
export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const wrap = useRef(null)
  const taskEditor = useTaskEditor()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onClick = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <Button variant="primary" icon={Plus} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Criar
      </Button>
      {open && (
        <div className="menu" role="menu" style={{ top: 'calc(100% + 4px)', left: 0 }}>
          {QUICK_ACTIONS.map((a) => (
            <button key={a.id} role="menuitem" className="menu__item" onClick={() => { setOpen(false); if (a.id === 'tarefa') taskEditor.openNew(); else setPending(a) }}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      <Dialog
        open={!!pending}
        title={pending?.label ?? ''}
        onClose={() => setPending(null)}
        actions={<Button variant="primary" onClick={() => setPending(null)}>Entendi</Button>}
      >
        <p>Este formulário ainda não existe. Ele será criado no commit {pending?.commit} do guia.</p>
      </Dialog>
    </div>
  )
}
