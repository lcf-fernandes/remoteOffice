// Commit 13 — eventos: constantes, validação e conversão de datas.
//
// FUSO HORÁRIO (decisão documentada em docs/DECISIONS.md):
// - Todo instante é guardado no Firestore como Timestamp (instante absoluto, UTC).
// - A tela sempre mostra e lê horários no fuso do navegador (Intl). Não há conversão manual.
// - Evento de "dia inteiro" e prazos (tarefa/projeto) guardam a meia-noite LOCAL do dia escolhido.
//   Se o fuso do aparelho mudar (viagem), o dia exibido pode deslocar-se; uma preferência de fuso fica para o commit 18.
import { inputToDate } from './tasks.js'

export const EVENT_TYPE_OPTIONS = [
  { value: 'meeting', label: 'Reunião' },
  { value: 'appointment', label: 'Compromisso' },
  { value: 'milestone', label: 'Marco de entrega' },
]
export const EVENT_TYPE_LABEL = Object.fromEntries(EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label]))

// Lembrete = minutos antes do início. ATENÇÃO: o app ainda não envia notificações; o valor só fica salvo.
export const REMINDER_OPTIONS = [
  { value: '', label: 'Sem lembrete' },
  { value: '0', label: 'No horário' },
  { value: '10', label: '10 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '1440', label: '1 dia antes' },
]
export const REMINDER_VALUES = [0, 10, 30, 60, 1440]

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const p2 = (n) => String(n).padStart(2, '0')
// Date <-> <input type="datetime-local"> (sempre horário local)
export const dateTimeToInput = (d) => (d ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}` : '')
export function inputToDateTime(value) {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return undefined
  const [, y, mo, d, h, mi] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi)
  return date.getMonth() === mo - 1 && date.getDate() === d && h < 24 && mi < 60 ? date : undefined
}

// Converte o valor do campo (data ou data/hora) conforme "dia inteiro".
export const parseEventInput = (value, allDay) => (allDay ? inputToDate(value) : inputToDateTime(value))

export function validateEvent(v) {
  const e = {}
  const title = v.title.trim()
  if (!title) e.title = 'Informe o título.'
  else if (title.length > 160) e.title = 'O título deve ter no máximo 160 caracteres.'
  if (v.description.length > 5000) e.description = 'A descrição deve ter no máximo 5000 caracteres.'
  const start = v.start ? parseEventInput(v.start, v.allDay) : null
  if (!v.start) e.start = 'Informe o início.'
  else if (start === undefined) e.start = 'Data ou horário inválido.'
  if (!v.allDay && v.end) {
    const end = parseEventInput(v.end, false)
    if (end === undefined) e.end = 'Data ou horário inválido.'
    else if (start && end < start) e.end = 'O fim não pode ser antes do início.'
  }
  if (v.reminder !== '' && !REMINDER_VALUES.includes(Number(v.reminder))) e.reminder = 'Lembrete inválido.'
  return e
}
