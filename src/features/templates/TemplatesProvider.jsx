import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToTemplates } from '../../services/templates.js'
import { BUILTIN_TEMPLATES } from '../../utils/templates.js'

const TemplatesContext = createContext(null)
export const useTemplates = () => useContext(TemplatesContext)

// `all` = modelos padrão (código) + modelos do usuário (Firestore). Os padrão funcionam mesmo sem conexão.
export default function TemplatesProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', mine: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToTemplates(uid, (mine) => setState({ status: 'ready', mine, error: null }), (error) => setState({ status: 'error', mine: [], error }))
  }, [uid, attempt])

  const value = useMemo(() => ({
    status: state.status, error: state.error, mine: state.mine,
    all: [...BUILTIN_TEMPLATES, ...[...state.mine].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))],
    retry: () => setAttempt((n) => n + 1),
  }), [state])
  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}
