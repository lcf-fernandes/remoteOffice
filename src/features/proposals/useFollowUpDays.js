import { useCallback, useState } from 'react'
import { DEFAULT_FOLLOW_UP_DAYS, FOLLOW_UP_DAY_OPTIONS } from '../../utils/proposals.js'

// Preferência guardada neste navegador (localStorage). Passa para as preferências da conta no commit 18.
const KEY = 'leandro-desk:followUpDays'

function read() {
  try {
    const n = Number(window.localStorage.getItem(KEY))
    return FOLLOW_UP_DAY_OPTIONS.includes(n) ? n : DEFAULT_FOLLOW_UP_DAYS
  } catch { return DEFAULT_FOLLOW_UP_DAYS }
}

export default function useFollowUpDays() {
  const [days, setDaysState] = useState(read)
  const setDays = useCallback((n) => {
    setDaysState(n)
    try { window.localStorage.setItem(KEY, String(n)) } catch { /* sem armazenamento: vale só nesta sessão */ }
  }, [])
  return [days, setDays]
}
