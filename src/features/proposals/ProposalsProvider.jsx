import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToProposals } from '../../services/proposals.js'

const ProposalsContext = createContext(null)
export const useProposals = () => useContext(ProposalsContext)

export default function ProposalsProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', proposals: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToProposals(
      uid,
      (proposals) => setState({ status: 'ready', proposals, error: null }),
      (error) => setState({ status: 'error', proposals: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(
    () => ({ ...state, byId: Object.fromEntries(state.proposals.map((p) => [p.id, p])), retry: () => setAttempt((n) => n + 1) }),
    [state]
  )
  return <ProposalsContext.Provider value={value}>{children}</ProposalsContext.Provider>
}
