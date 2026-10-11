import { useCallback, useState } from 'react'
import { usePreferences } from '../preferences/PreferencesProvider.jsx'
import { DEFAULT_FOLLOW_UP_DAYS, FOLLOW_UP_DAY_OPTIONS } from '../../utils/proposals.js'

// Prazo de "sem retorno" das propostas, guardado na CONTA (preferences.followUpDays).
// Migração: se a conta ainda não tem o valor, usa o que havia sido salvo antes neste navegador (localStorage);
// ao escolher um valor, grava na conta e apaga o antigo.
const LEGACY_KEY = 'leandro-desk:followUpDays'

function readLegacy() {
  try {
    const n = Number(window.localStorage.getItem(LEGACY_KEY))
    return FOLLOW_UP_DAY_OPTIONS.includes(n) ? n : null
  } catch { return null }
}

export default function useFollowUpDays() {
  const { prefs, update } = usePreferences()
  const [legacy, setLegacy] = useState(readLegacy)
  const days = prefs.followUpDays ?? legacy ?? DEFAULT_FOLLOW_UP_DAYS
  const setDays = useCallback(async (n) => {
    await update({ followUpDays: n })
    try { window.localStorage.removeItem(LEGACY_KEY) } catch { /* ignorar */ }
    setLegacy(null)
  }, [update])
  return [days, setDays]
}
