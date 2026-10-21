import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import { Checkbox, Input, Select } from '../../components/Field.jsx'
import { ErrorState } from '../../components/states.jsx'
import { usePreferences } from './PreferencesProvider.jsx'
import ContextSwitcher from './ContextSwitcher.jsx'
import { CURRENCY_OPTIONS, FOLLOW_UP_DAY_OPTIONS } from '../../utils/proposals.js'
import { DASHBOARD_BLOCKS, DATE_STYLE_OPTIONS, MAX_EXTERNAL_LINKS, THEME_OPTIONS, WEEK_START_OPTIONS, validateExternalLink } from '../../utils/preferences.js'
import { localTimeZone } from '../../utils/events.js'
import { ALERT_TYPES, DUE_SOON_OPTIONS } from '../../utils/alerts.js'
import { formatDate } from '../../utils/format.js'
import { focusFirstInvalid } from '../../utils/focus.js'

export default function SettingsPage() {
  const { status, error, prefs, displayName, update, updateName } = usePreferences()
  const [nameDraft, setNameDraft] = useState(null)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [link, setLink] = useState({ label: '', url: '' })
  const [linkErrors, setLinkErrors] = useState({})

  async function save(patch, okMessage = 'Preferência salva.') {
    setSaveError(''); setMessage('')
    try { await update(patch); setMessage(okMessage) } catch (err) { setSaveError(err.message) }
  }
  const pick = (key) => (e) => save({ [key]: e.target.value })

  function toggleBlock(id, visible) {
    const hidden = visible ? prefs.hiddenBlocks.filter((b) => b !== id) : [...new Set([...prefs.hiddenBlocks, id])]
    save({ hiddenBlocks: hidden })
  }

  async function addLink(e) {
    e.preventDefault()
    const found = validateExternalLink(link, prefs.externalLinks)
    setLinkErrors(found)
    if (Object.keys(found).length) { focusFirstInvalid(e.currentTarget); return }
    await save({ externalLinks: [...prefs.externalLinks, { label: link.label.trim(), url: link.url.trim() }] }, 'Atalho adicionado.')
    setLink({ label: '', url: '' })
  }
  function toggleAlert(id, on) {
    const disabled = on ? prefs.disabledAlerts.filter((a) => a !== id) : [...new Set([...prefs.disabledAlerts, id])]
    save({ disabledAlerts: disabled })
  }
  async function saveName(e) {
    e.preventDefault()
    const name = (nameDraft ?? displayName).trim()
    if (name.length > 60) return setSaveError('O nome deve ter no máximo 60 caracteres.')
    setSaveError(''); setMessage('')
    try { await updateName(name); setNameDraft(null); setMessage('Nome salvo.') } catch (err) { setSaveError(err.message) }
  }
  const removeLink = (url) => save({ externalLinks: prefs.externalLinks.filter((l) => l.url !== url) }, 'Atalho removido.')

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>Salvas na sua conta: continuam em qualquer aparelho e depois de um novo login.</p>
        </div>
      </header>

      {status === 'error' && <ErrorState title="Não foi possível carregar as preferências">Estão sendo usados os valores padrão. {error?.code === 'permission-denied' ? 'Confira se as regras do Firestore foram publicadas (docs/FIREBASE.md).' : ''}</ErrorState>}
      {saveError && <ErrorState title="Não foi possível salvar">{saveError}</ErrorState>}
      {message && <p className="login__info" role="status">{message}</p>}

      <Card title="Perfil" id="s-profile" hint="Usado na saudação do dashboard. Em branco, a saudação aparece sem nome.">
        <form className="form" onSubmit={saveName} noValidate>
          <Input label="Seu nome" value={nameDraft ?? displayName} onChange={(e) => setNameDraft(e.target.value)} />
          <div><Button type="submit" disabled={nameDraft === null || nameDraft.trim() === displayName}>Salvar nome</Button></div>
        </form>
      </Card>

      <Card title="Contexto de trabalho" id="s-ctx" hint="Reorganiza o dashboard e as ações rápidas sem duplicar dados">
        <ContextSwitcher />
      </Card>

      <Card title="Aparência e região" id="s-look">
        <div className="form">
          <div className="form__row">
            <Select label="Tema" value={prefs.theme} onChange={pick('theme')} options={THEME_OPTIONS} />
            <Select label="Moeda padrão" value={prefs.currency} onChange={pick('currency')} options={CURRENCY_OPTIONS} />
          </div>
          <div className="form__row">
            <Select label="Formato de data" value={prefs.dateStyle} onChange={pick('dateStyle')} options={DATE_STYLE_OPTIONS} />
            <Select label="Início da semana (calendário)" value={prefs.weekStart} onChange={pick('weekStart')} options={WEEK_START_OPTIONS} />
          </div>
          <p className="card__hint">
            A moeda padrão vem pré-selecionada em propostas e lançamentos (você pode trocar em cada um). O formato numérico vale para datas sem dia da semana nem hora; hoje: {formatDate(new Date(), { day: '2-digit', month: 'long', year: 'numeric' })}.
            Horários usam o fuso do navegador ({localTimeZone()}); não há preferência de fuso.
          </p>
        </div>
      </Card>

      <Card title="Blocos do dashboard" id="s-blocks" hint="Desmarque para ocultar. O contexto escolhe a ordem e o destaque.">
        <div className="form">
          {DASHBOARD_BLOCKS.map((b) => <Checkbox key={b.id} label={b.label} checked={!prefs.hiddenBlocks.includes(b.id)} onChange={(e) => toggleBlock(b.id, e.target.checked)} />)}
        </div>
      </Card>

      <Card title="Propostas" id="s-prop">
        <Select label="Considerar “sem retorno” após" value={String(prefs.followUpDays ?? 7)} onChange={(e) => save({ followUpDays: Number(e.target.value) })} options={FOLLOW_UP_DAY_OPTIONS.map((n) => ({ value: String(n), label: `${n} dias` }))} />
      </Card>

      <Card title="Alertas internos" id="s-alerts" hint="Avisos visuais no dashboard. São calculados na hora a partir dos seus dados: não enviam mensagens nem fazem nada sozinhos.">
        <div className="form">
          <Select label="Avisar de prazos com antecedência de" value={String(prefs.alertDueSoonDays)} onChange={(e) => save({ alertDueSoonDays: Number(e.target.value) })} options={DUE_SOON_OPTIONS.map((n) => ({ value: String(n), label: n === 1 ? '1 dia (hoje e amanhã)' : `${n} dias` }))} />
          {ALERT_TYPES.map((a) => (
            <div key={a.id}>
              <Checkbox label={a.label} checked={!prefs.disabledAlerts.includes(a.id)} onChange={(e) => toggleAlert(a.id, e.target.checked)} />
              <p className="card__hint">{a.rule}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Atalhos externos" id="s-links" hint={`Até ${MAX_EXTERNAL_LINKS}. São apenas links que abrem em nova aba; o app não se conecta a esses serviços.`}>
        {prefs.externalLinks.length > 0 && (
          <ul className="rows">
            {prefs.externalLinks.map((l) => (
              <li key={l.url} className="row">
                <div><a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a><p className="row__meta">{l.url}</p></div>
                <Button variant="ghost" icon={Trash2} aria-label={`Remover atalho ${l.label}`} onClick={() => removeLink(l.url)} />
              </li>
            ))}
          </ul>
        )}
        <form className="form" onSubmit={addLink} noValidate>
          <div className="form__row">
            <Input label="Nome" value={link.label} onChange={(e) => setLink((v) => ({ ...v, label: e.target.value }))} error={linkErrors.label} />
            <Input label="Endereço (https://…)" type="url" value={link.url} onChange={(e) => setLink((v) => ({ ...v, url: e.target.value }))} error={linkErrors.url} />
          </div>
          <div><Button type="submit" icon={Plus}>Adicionar atalho</Button></div>
        </form>
      </Card>
    </div>
  )
}
