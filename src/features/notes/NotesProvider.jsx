import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToNotes, subscribeToWorkLog } from '../../services/notes.js'

const NotesContext = createContext(null)
export const useNotes = () => useContext(NotesContext)

export default function NotesProvider({ uid, children }) {
  const [notes, setNotes] = useState({ status: 'loading', list: [] })
  const [log, setLog] = useState({ status: 'loading', list: [] })
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setNotes((s) => ({ ...s, status: 'loading' })); setLog((s) => ({ ...s, status: 'loading' })); setError(null)
    const fail = (err) => { setError(err); setNotes({ status: 'error', list: [] }); setLog({ status: 'error', list: [] }) }
    const u1 = subscribeToNotes(uid, (list) => setNotes({ status: 'ready', list }), fail)
    const u2 = subscribeToWorkLog(uid, (list) => setLog({ status: 'ready', list }), fail)
    return () => { u1(); u2() }
  }, [uid, attempt])

  const status = notes.status === 'error' || log.status === 'error' ? 'error' : notes.status === 'ready' && log.status === 'ready' ? 'ready' : 'loading'
  const value = useMemo(() => ({ status, error, notes: notes.list, workLog: log.list, retry: () => setAttempt((n) => n + 1) }), [status, error, notes.list, log.list])
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}
