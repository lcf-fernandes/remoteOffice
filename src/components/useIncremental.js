import { useState } from 'react'

export const PAGE_SIZE = 50

// Carregamento incremental de listas longas: mostra os primeiros `pageSize` itens e libera mais sob demanda.
// Filtros, busca e totais continuam valendo para TODOS os itens (só a lista na tela é cortada). Volta ao início quando `resetKey` muda.
export default function useIncremental(items, resetKey = '', pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, limit: pageSize })
  const limit = state.key === resetKey ? state.limit : pageSize
  return {
    shown: items.slice(0, limit),
    total: items.length,
    remaining: Math.max(0, items.length - limit),
    pageSize,
    showMore: () => setState({ key: resetKey, limit: limit + pageSize }),
  }
}
