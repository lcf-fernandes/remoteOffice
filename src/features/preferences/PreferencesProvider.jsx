import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { preferencesErrorMessage, subscribeToPreferences, updatePreferences } from '../../services/preferences.js'
import { resolvePreferences, resolveTheme } from '../../utils/preferences.js'
import { setDateStyle } from '../../utils/format.js'

const PreferencesContext = createContext(null)
export const usePreferences = () => useContext(PreferencesContext)

// Preferências ao vivo (por usuário, na conta). Aplica o tema e o estilo de data para todo o app.
export default function PreferencesProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading', raw: {}, error: null })
  const [systemDark, setSystemDark] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false))

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    return subscribeToPreferences(user.uid, (raw) => setState({ status: 'ready', raw, error: null }), (error) => setState({ status: 'error', raw: {}, error }))
  }, [user.uid])

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const prefs = useMemo(() => resolvePreferences(state.raw), [state.raw])
  setDateStyle(prefs.dateStyle) // idempotente; precisa valer antes de os filhos renderizarem

  useEffect(() => {
    const theme = resolveTheme(prefs.theme, systemDark)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [prefs.theme, systemDark])

  // Salva uma ou mais preferências. Rejeita com mensagem em português se falhar (o chamador mostra o erro).
  const update = useCallback(async (patch) => {
    try { await updatePreferences(user.uid, patch) } catch (err) { throw new Error(preferencesErrorMessage(err)) }
  }, [user.uid])

  const value = useMemo(() => ({ status: state.status, error: state.error, prefs, update }), [state.status, state.error, prefs, update])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
