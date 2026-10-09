import { EmptyState } from '../../components/states.jsx'
import { NAV } from '../../layout/nav.js'

export default function ModulePlaceholder({ route }) {
  const item = NAV.find((n) => n.id === route)
  return (
    <div className="center__inner">
      <h1 className="page-title">{item?.label ?? 'Página não encontrada'}</h1>
      <EmptyState title="A implementar">
        {item?.commit ? `Este módulo será construído no commit ${item.commit} do guia.` : 'Escolha uma seção no menu.'}
      </EmptyState>
    </div>
  )
}
