import { useState } from 'react'
import { usePreferences } from './PreferencesProvider.jsx'
import { Select } from '../../components/Field.jsx'
import { CONTEXTS } from '../../utils/contexts.js'
import { CONTEXT_IDS } from '../../utils/preferences.js'

// Troca o contexto de trabalho (salvo na conta). Só muda a apresentação; nenhum dado é criado ou copiado.
export default function ContextSwitcher({ variant = 'chips' }) {
  const { prefs, update } = usePreferences()
  const [error, setError] = useState('')

  async function choose(id) {
    if (id === prefs.context) return
    setError('')
    try { await update({ context: id }) } catch (err) { setError(err.message) }
  }

  if (variant === 'select') {
    return (
      <div className="ctx-select">
        <Select label="Contexto" value={prefs.context} onChange={(e) => choose(e.target.value)} options={CONTEXT_IDS.map((id) => ({ value: id, label: CONTEXTS[id].label }))} />
        {error && <p className="left__err" role="alert">{error}</p>}
      </div>
    )
  }
  return (
    <div>
      <div className="chips" role="group" aria-label="Contexto de trabalho">
        {CONTEXT_IDS.map((id) => <button key={id} type="button" className="chip" aria-pressed={prefs.context === id} onClick={() => choose(id)}>{CONTEXTS[id].label}</button>)}
      </div>
      <p className="card__hint">{CONTEXTS[prefs.context].description} O contexto só reorganiza o que já existe.</p>
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  )
}
