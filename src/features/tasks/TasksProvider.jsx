import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToTasks } from '../../services/tasks.js'

const TasksContext = createContext(null)
export const useTasks = () => useContext(TasksContext)

// status: loading | ready | error. Uma única assinatura por sessão, compartilhada por todas as telas.
export default function TasksProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', tasks: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToTasks(
      uid,
      (tasks) => setState({ status: 'ready', tasks, error: null }),
      (error) => setState({ status: 'error', tasks: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(() => ({ ...state, retry: () => setAttempt((n) => n + 1) }), [state])
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}
