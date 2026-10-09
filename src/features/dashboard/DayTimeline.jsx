import { formatDate } from '../../utils/format.js'

const START = 8, END = 20 // janela exibida: 08h–20h
const pct = (d) => {
  const x = new Date(d)
  const h = x.getHours() + x.getMinutes() / 60
  return Math.min(100, Math.max(0, ((h - START) / (END - START)) * 100))
}
const hm = (d) => formatDate(d, { hour: '2-digit', minute: '2-digit' })

export default function DayTimeline({ events }) {
  const now = new Date()
  const showNow = now.getHours() >= START && now.getHours() < END
  return (
    <div>
      <div className="timeline" aria-hidden="true">
        {Array.from({ length: END - START + 1 }, (_, i) => (
          <span key={i} className="timeline__tick" style={{ left: `${(i / (END - START)) * 100}%` }}>
            {i % 2 === 0 ? String(START + i).padStart(2, '0') : ''}
          </span>
        ))}
        {events.map((e) => (
          <span key={e.id} className="timeline__block" style={{ left: `${pct(e.start)}%`, width: `${pct(e.end) - pct(e.start)}%` }} />
        ))}
        {showNow && <span className="timeline__now" style={{ left: `${pct(now)}%` }} />}
      </div>
      <ul className="timeline__list">
        {events.map((e) => (
          <li key={e.id}><span className="timeline__time">{hm(e.start)}–{hm(e.end)}</span> {e.title}</li>
        ))}
      </ul>
    </div>
  )
}
