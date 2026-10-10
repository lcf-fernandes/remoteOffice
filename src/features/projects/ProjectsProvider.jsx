import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeToProjects } from '../../services/projects.js'

const ProjectsContext = createContext(null)
export const useProjects = () => useContext(ProjectsContext)

export default function ProjectsProvider({ uid, children }) {
  const [state, setState] = useState({ status: 'loading', projects: [], error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    return subscribeToProjects(
      uid,
      (projects) => setState({ status: 'ready', projects, error: null }),
      (error) => setState({ status: 'error', projects: [], error })
    )
  }, [uid, attempt])

  const value = useMemo(
    () => ({ ...state, byId: Object.fromEntries(state.projects.map((p) => [p.id, p])), retry: () => setAttempt((n) => n + 1) }),
    [state]
  )
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}
