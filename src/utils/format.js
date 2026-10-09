// Datas e valores formatados pela região configurada (padrão pt-BR).
export const DEFAULT_LOCALE = 'pt-BR'

export function formatDate(date, opts = { day: '2-digit', month: 'short' }, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(date))
}

export function formatLongDate(date = new Date(), locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

// Valores monetários são guardados como número + código da moeda, nunca como texto formatado.
export function formatMoney(amount, currency = 'BRL', locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function daysFromToday(date) {
  const a = new Date(date); a.setHours(0, 0, 0, 0)
  const b = new Date(); b.setHours(0, 0, 0, 0)
  return Math.round((a - b) / 86400000)
}

export function relativeDay(date) {
  const d = daysFromToday(date)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  if (d < 0) return `${Math.abs(d)} dias de atraso`
  return `em ${d} dias`
}
