export default function Button({ variant = 'secondary', icon: Icon, loading = false, children, className = '', ...props }) {
  const iconOnly = Icon && !children
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${iconOnly ? 'btn--icon' : ''} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {loading ? 'Aguarde…' : children}
    </button>
  )
}
