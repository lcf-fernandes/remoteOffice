// Commit 18 — preferências do usuário (tema, moeda, formato de data, início da semana, contexto, blocos, atalhos).
// Guardadas em users/{uid}.preferences. Valores ausentes ou inválidos caem no padrão, nunca quebram a interface.
export const THEME_OPTIONS = [
  { value: 'system', label: 'Seguir o sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]
export const DATE_STYLE_OPTIONS = [
  { value: 'br', label: 'Brasileiro (10 de out. de 2026)' },
  { value: 'iso', label: 'Numérico ISO (2026-10-10)' },
]
export const WEEK_START_OPTIONS = [
  { value: 'sun', label: 'Domingo' },
  { value: 'mon', label: 'Segunda-feira' },
]
export const CONTEXT_IDS = ['today', 'development', 'editing', 'commercial']
export const CURRENCY_VALUES = ['BRL', 'USD', 'EUR', 'PYG']
export const FOLLOW_UP_VALUES = [3, 7, 14, 30]

// Blocos do dashboard que podem ser ocultados (cada contexto decide a ordem e o destaque).
export const DASHBOARD_BLOCKS = [
  { id: 'agenda', label: 'Linha do dia' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'projects', label: 'Projetos' },
  { id: 'video', label: 'Fila de vídeos (Edição)' },
  { id: 'resume', label: 'Retomar (registro de trabalho)' },
  { id: 'proposals', label: 'Propostas para retomar' },
  { id: 'finance', label: 'A receber e a pagar' },
  { id: 'clients', label: 'Clientes: próximas ações' },
]
export const BLOCK_IDS = DASHBOARD_BLOCKS.map((b) => b.id)

export const MAX_EXTERNAL_LINKS = 10

export function isValidExternalUrl(value) {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}

export function validateExternalLink({ label, url }, existing = []) {
  const e = {}
  const l = label.trim()
  const u = url.trim()
  if (!l) e.label = 'Informe o nome do atalho.'
  else if (l.length > 40) e.label = 'O nome deve ter no máximo 40 caracteres.'
  if (!u) e.url = 'Informe o endereço.'
  else if (!isValidExternalUrl(u)) e.url = 'Use um endereço completo, começando com http:// ou https://.'
  else if (u.length > 500) e.url = 'O endereço deve ter no máximo 500 caracteres.'
  if (!e.url && existing.some((x) => x.url === u)) e.url = 'Este endereço já está nos atalhos.'
  if (existing.length >= MAX_EXTERNAL_LINKS) e.label = `Limite de ${MAX_EXTERNAL_LINKS} atalhos atingido.`
  return e
}

export const DEFAULT_PREFS = {
  theme: 'system',
  currency: 'BRL',
  dateStyle: 'br',
  weekStart: 'sun',
  context: 'today',
  hiddenBlocks: [],
  externalLinks: [],
  followUpDays: null, // null = ainda não definido na conta
}

const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

export function resolvePreferences(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    theme: oneOf(r.theme, THEME_OPTIONS.map((o) => o.value), DEFAULT_PREFS.theme),
    currency: oneOf(r.currency, CURRENCY_VALUES, DEFAULT_PREFS.currency),
    dateStyle: oneOf(r.dateStyle, DATE_STYLE_OPTIONS.map((o) => o.value), DEFAULT_PREFS.dateStyle),
    weekStart: oneOf(r.weekStart, WEEK_START_OPTIONS.map((o) => o.value), DEFAULT_PREFS.weekStart),
    context: oneOf(r.context, CONTEXT_IDS, DEFAULT_PREFS.context),
    hiddenBlocks: Array.isArray(r.hiddenBlocks) ? [...new Set(r.hiddenBlocks.filter((b) => BLOCK_IDS.includes(b)))] : [],
    externalLinks: Array.isArray(r.externalLinks)
      ? r.externalLinks.filter((l) => l && typeof l.label === 'string' && typeof l.url === 'string' && isValidExternalUrl(l.url)).slice(0, MAX_EXTERNAL_LINKS).map((l) => ({ label: l.label, url: l.url }))
      : [],
    followUpDays: FOLLOW_UP_VALUES.includes(r.followUpDays) ? r.followUpDays : null,
  }
}

// 'system' segue o esquema de cores do aparelho.
export const resolveTheme = (theme, systemPrefersDark) => (theme === 'dark' || (theme === 'system' && systemPrefersDark) ? 'dark' : 'light')
export const weekStartDay = (weekStart) => (weekStart === 'mon' ? 1 : 0)
