import { useId } from 'react'

export function Input({ label, error, ...props }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && <p className="field__error" id={`${id}-err`}>{error}</p>}
    </div>
  )
}

export function Select({ label, options, error, ...props }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <select id={id} className="select" aria-invalid={!!error} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, ...props }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <textarea id={id} className="input textarea" rows={4} aria-invalid={!!error} {...props} />
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}
