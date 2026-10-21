import Button from './Button.jsx'

// Rodapé de uma lista incremental: quantos itens aparecem e o botão para carregar mais. Some quando a lista cabe numa página.
export default function ShowMore({ inc, noun = 'itens' }) {
  if (inc.total <= inc.pageSize) return null
  const next = Math.min(inc.remaining, inc.pageSize)
  return (
    <div className="more">
      <p className="row__meta" role="status">Mostrando {inc.shown.length} de {inc.total} {noun}</p>
      {inc.remaining > 0 && <Button onClick={inc.showMore}>Mostrar mais {next}</Button>}
    </div>
  )
}
