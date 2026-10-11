import { EmptyState } from '../../components/states.jsx'

// Todos os módulos do menu já existem; esta tela aparece apenas para endereços desconhecidos (#/algo-que-nao-existe).
export default function ModulePlaceholder() {
  return (
    <div className="center__inner">
      <h1 className="page-title">Página não encontrada</h1>
      <EmptyState title="Este endereço não existe" action={<a href="#/dashboard">Ir para o Dashboard</a>}>Use o menu à esquerda para escolher uma seção.</EmptyState>
    </div>
  )
}
