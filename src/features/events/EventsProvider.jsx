import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToEvents } from '../../services/events.js'

const EventsContext = createContext(null)
export const useEvents = () => useContext(EventsContext)

export default function EventsProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', events: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToEvents(
      uid,
      (events) => setState({ status: 'ready', events, error: null }),
      (error) => setState({ status: 'error', events: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(() => ({ ...state, retry: () => setAttempt((n) => n + 1) }), [state])
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}
