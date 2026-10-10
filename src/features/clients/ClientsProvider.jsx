import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToClients } from '../../services/clients.js'

const ClientsContext = createContext(null)
export const useClients = () => useContext(ClientsContext)

// Uma assinatura por sessão. `byId` evita duplicar nomes de clientes em outras telas.
export default function ClientsProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', clients: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToClients(
      uid,
      (clients) => setState({ status: 'ready', clients, error: null }),
      (error) => setState({ status: 'error', clients: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(
    () => ({ ...state, byId: Object.fromEntries(state.clients.map((c) => [c.id, c])), retry: () => setAttempt((n) => n + 1) }),
    [state]
  )
  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}
