import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToTransactions } from '../../services/transactions.js'

const TransactionsContext = createContext(null)
export const useTransactions = () => useContext(TransactionsContext)

export default function TransactionsProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', transactions: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToTransactions(
      uid,
      (transactions) => setState({ status: 'ready', transactions, error: null }),
      (error) => setState({ status: 'error', transactions: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(() => ({ ...state, retry: () => setAttempt((n) => n + 1) }), [state])
  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}
