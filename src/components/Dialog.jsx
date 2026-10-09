import { useEffect, useId, useRef } from 'react'

// Usa o <dialog> nativo: Esc fecha, o foco fica preso e retorna ao gatilho.
export default function Dialog({ open, title, onClose, children, actions, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className={`dialog ${wide ? 'dialog--wide' : ''}`} aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <div className="dialog__body">
          <h2 id={titleId} className="card__title">{title}</h2>
          {children}
          {actions && <div className="dialog__actions">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
