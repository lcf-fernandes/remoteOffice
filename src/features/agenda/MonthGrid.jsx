import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { dayKey, monthWeeks } from '../../utils/agenda.js'

const WEEKDAYS = [['D', 'domingo'], ['S', 'segunda'], ['T', 'terça'], ['Q', 'quarta'], ['Q', 'quinta'], ['S', 'sexta'], ['S', 'sábado']]
const title = (d) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Marcadores com formas diferentes (não só cor): ● evento · ■ prazo de tarefa · ◆ prazo de projeto.
export default function MonthGrid({ month, byDay, selected, onSelect, onMonth }) {
  const today = dayKey(new Date())
  return (
    <div className="cal">
      <div className="cal__head">
        <Button variant="ghost" icon={ChevronLeft} aria-label="Mês anterior" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        <h2 className="cal__title" aria-live="polite">{title(month)}</h2>
        <Button variant="ghost" icon={ChevronRight} aria-label="Próximo mês" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        <Button onClick={() => { const n = new Date(); onMonth(new Date(n.getFullYear(), n.getMonth(), 1)); onSelect(dayKey(n)) }}>Hoje</Button>
      </div>
      <div className="cal__grid" role="grid" aria-label={title(month)}>
        {WEEKDAYS.map(([s, full], i) => <div key={i} className="cal__dow" role="columnheader"><span aria-hidden="true">{s}</span><span className="sr-only">{full}</span></div>)}
        {monthWeeks(month).flat().map((d) => {
          const key = dayKey(d)
          const items = byDay[key] ?? []
          const c = { event: 0, task: 0, project: 0 }
          items.forEach((i) => { c[i.kind] += 1 })
          const label = `${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(d)}: ${items.length ? [c.event && plural(c.event, 'evento', 'eventos'), c.task && plural(c.task, 'prazo de tarefa', 'prazos de tarefas'), c.project && plural(c.project, 'prazo de projeto', 'prazos de projetos')].filter(Boolean).join(', ') : 'nada agendado'}`
          return (
            <button
              key={key} type="button" role="gridcell" aria-label={label} aria-pressed={selected === key}
              className={`cal__day ${d.getMonth() !== month.getMonth() ? 'is-out' : ''} ${key === today ? 'is-today' : ''}`}
              onClick={() => onSelect(key)}
            >
              <span className="cal__num">{d.getDate()}</span>
              <span className="cal__marks" aria-hidden="true">
                {c.event > 0 && <span className="mark mark--event">{c.event}</span>}
                {c.task > 0 && <span className="mark mark--task">{c.task}</span>}
                {c.project > 0 && <span className="mark mark--project">{c.project}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="card__hint">Legenda: <span className="mark mark--event">1</span> eventos · <span className="mark mark--task">1</span> prazos de tarefas · <span className="mark mark--project">1</span> prazos de projetos</p>
    </div>
  )
}
