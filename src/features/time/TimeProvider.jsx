import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToEntries, subscribeToTimer } from '../../services/time.js'

const TimeContext = createContext(null)
export const useTime = () => useContext(TimeContext)

// Cronômetro ativo e registros vêm do Firestore (nada fica só na memória do navegador).
export default function TimeProvider({ uid, children }) {
  const [timer, setTimer] = useState({ status: 'loading', data: null })
  const [entries, setEntries] = useState({ status: 'loading', list: [] })
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setTimer((s) => ({ ...s, status: 'loading' })); setEntries((s) => ({ ...s, status: 'loading' })); setError(null)
    const fail = (err) => { setError(err); setTimer({ status: 'error', data: null }); setEntries({ status: 'error', list: [] }) }
    const u1 = subscribeToTimer(uid, (data) => setTimer({ status: 'ready', data }), fail)
    const u2 = subscribeToEntries(uid, (list) => setEntries({ status: 'ready', list }), fail)
    return () => { u1(); u2() }
  }, [uid, attempt])

  const status = timer.status === 'error' || entries.status === 'error' ? 'error' : timer.status === 'ready' && entries.status === 'ready' ? 'ready' : 'loading'
  const value = useMemo(() => ({ status, error, timer: timer.data, entries: entries.list, retry: () => setAttempt((n) => n + 1) }), [status, error, timer.data, entries.list])
  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}
