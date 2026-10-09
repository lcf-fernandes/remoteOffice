import { useEffect, useRef } from 'react'

// Usa o <dialog> nativo: Esc fecha, o foco fica preso e retorna ao gatilho.
export default function Dialog({ open, title, onClose, children, actions }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onClose={onClose}>
      <div className="dialog__body">
        <h2 id="dialog-title" className="card__title">{title}</h2>
        {children}
        <div className="dialog__actions">{actions}</div>
      </div>
    </dialog>
  )
}
