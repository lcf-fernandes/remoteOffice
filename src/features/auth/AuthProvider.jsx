import { createContext, useContext, useEffect, useState } from 'react'
import { firebaseStatus } from '../../services/firebase.js'
import { loadOrCreateProfile, subscribeToAuth } from '../../services/auth.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// status: unconfigured | loading | signedOut | signedIn | error
export default function AuthProvider({ children }) {
  const [state, setState] = useState(
    firebaseStatus.configured ? { status: 'loading' } : { status: 'unconfigured' }
  )

  useEffect(() => {
    if (!firebaseStatus.configured) return undefined
    return subscribeToAuth(
      async (user) => {
        if (!user) return setState({ status: 'signedOut' })
        setState({ status: 'loading' })
        try {
          const profile = await loadOrCreateProfile(user)
          setState({ status: 'signedIn', user, profile })
        } catch (error) {
          setState({ status: 'error', error })
        }
      },
      (error) => setState({ status: 'error', error })
    )
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
