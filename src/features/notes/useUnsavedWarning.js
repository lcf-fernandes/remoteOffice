import { useEffect } from 'react'

// Avisa ao recarregar/fechar a aba enquanto houver alterações não salvas.
export default function useUnsavedWarning(active) {
  useEffect(() => {
    if (!active) return undefined
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
