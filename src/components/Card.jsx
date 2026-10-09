export default function Card({ title, hint, action, children, as: Tag = 'section', className = '', id }) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <Tag className={`card ${className}`} aria-labelledby={title ? titleId : undefined}>
      {(title || action) && (
        <div className="card__head">
          <div>
            {title && <h2 className="card__title" id={titleId}>{title}</h2>}
            {hint && <p className="card__hint">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Tag>
  )
}
