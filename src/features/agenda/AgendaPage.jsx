import { useMemo, useState } from 'react'
import { CalendarDays, Flag, FolderKanban, ListChecks, Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { Select } from '../../components/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import MonthGrid from './MonthGrid.jsx'
import { useEvents } from '../events/EventsProvider.jsx'
import { useEventEditor } from '../events/EventEditor.jsx'
import { usePreferences } from '../preferences/PreferencesProvider.jsx'
import { weekStartDay } from '../../utils/preferences.js'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useTaskEditor } from '../tasks/TaskEditor.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { eventErrorMessage } from '../../services/events.js'
import { AGENDA_RANGES, AGENDA_SOURCES, KIND_LABEL, buildAgendaItems, dayHeading, dayKey, filterAgenda, groupByDay, itemsByDay, startOfDay, whenLabel } from '../../utils/agenda.js'
import { EVENT_TYPE_LABEL, localTimeZone } from '../../utils/events.js'

const ICON = { event: CalendarDays, task: ListChecks, project: FolderKanban }

export function AgendaItem({ item, onOpen }) {
  const Icon = item.kind === 'event' && item.subtype === 'milestone' ? Flag : ICON[item.kind]
  const late = item.kind !== 'event' && startOfDay(item.start) < startOfDay(new Date())
  return (
    <li className={`aitem aitem--${item.kind}`}>
      <Icon size={16} aria-hidden="true" className="aitem__icon" />
      <div className="aitem__main">
        <button type="button" className="linklike" onClick={() => onOpen(item)}>{item.title}</button>
        <p className="row__meta">
          <strong>{KIND_LABEL[item.kind]}{item.kind === 'event' ? ` · ${EVENT_TYPE_LABEL[item.subtype] ?? ''}` : ''}</strong>
          {' · '}<span className={late ? 'is-late' : ''}>{whenLabel(item)}</span>
        </p>
      </div>
    </li>
  )
}

export default function AgendaPage() {
  const ev = useEvents()
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const eventEditor = useEventEditor()
  const { prefs } = usePreferences()
  const taskEditor = useTaskEditor()
  const [mode, setMode] = useState('list')
  const [range, setRange] = useState('week')
  const [source, setSource] = useState('all')
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [selected, setSelected] = useState(() => dayKey(new Date()))

  const all = useMemo(() => buildAgendaItems({ events: ev.events, tasks, projects }), [ev.events, tasks, projects])
  const sourceFiltered = useMemo(() => (source === 'all' ? all : all.filter((i) => i.kind === source)), [all, source])
  const listGroups = useMemo(() => groupByDay(filterAgenda(all, { range, source })), [all, range, source])
  const byDay = useMemo(() => itemsByDay(sourceFiltered), [sourceFiltered])
  const dayItems = byDay[selected] ?? []

  function open(item) {
    if (item.kind === 'event') eventEditor.openEdit(item.ref)
    else if (item.kind === 'task') taskEditor.openEdit(item.ref)
    else window.location.hash = `#/projetos/${item.ref.id}`
  }
  const day = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
  const renderList = (items) => <ul className="alist">{items.map((i) => <AgendaItem key={i.key} item={i} onOpen={open} />)}</ul>

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>Horários no fuso {localTimeZone()}. Lembretes ainda não geram notificações.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => eventEditor.openNew({ start: `${dayKey(mode === 'month' ? day(selected) : new Date())}T09:00` })}>Novo evento</Button>
      </header>

      <div className="filters">
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Formato">
            <button type="button" className="chip" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>Lista cronológica</button>
            <button type="button" className="chip" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Mês</button>
          </div>
          {mode === 'list' && (
            <div className="chips" role="group" aria-label="Período">
              {AGENDA_RANGES.map((r) => <button key={r.id} type="button" className="chip" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
            </div>
          )}
        </div>
        <div className="actions__select"><Select label="Mostrar" value={source} onChange={(e) => setSource(e.target.value)} options={AGENDA_SOURCES} /></div>
      </div>

      {ev.status === 'loading' && <LoadingState label="Carregando agenda…" />}
      {ev.status === 'error' && <ErrorState title="Não foi possível carregar a agenda" onRetry={ev.retry}>{eventErrorMessage(ev.error)}</ErrorState>}

      {ev.status === 'ready' && mode === 'list' && (
        listGroups.length === 0 ? (
          <EmptyState title={range === 'overdue' ? 'Nenhum prazo vencido' : 'Nada neste período'} action={range === 'overdue' ? null : <Button icon={Plus} onClick={() => eventEditor.openNew()}>Criar evento</Button>}>
            {range === 'overdue' ? 'Tarefas e projetos abertos com prazo no passado aparecem aqui.' : 'Eventos e prazos de tarefas e projetos aparecem aqui.'}
          </EmptyState>
        ) : (
          listGroups.map((g) => (
            <section key={g.key} className="card" aria-label={dayHeading(g.date)}>
              <h2 className="card__title agenda__day">{dayHeading(g.date)}{g.key === dayKey(new Date()) ? ' · hoje' : ''}</h2>
              {renderList(g.items)}
            </section>
          ))
        )
      )}

      {ev.status === 'ready' && mode === 'month' && (
        <>
          <MonthGrid weekStart={weekStartDay(prefs.weekStart)} month={month} byDay={byDay} selected={selected} onSelect={setSelected} onMonth={setMonth} />
          <section className="card" aria-label="Itens do dia selecionado">
            <div className="card__head">
              <h2 className="card__title agenda__day">{dayHeading(day(selected))}</h2>
              <Button icon={Plus} onClick={() => eventEditor.openNew({ start: `${selected}T09:00` })}>Evento neste dia</Button>
            </div>
            {dayItems.length ? renderList(dayItems) : <EmptyState title="Nada agendado neste dia" />}
          </section>
        </>
      )}

      <p className="card__hint">Eventos de vários dias aparecem no dia de início. Marcos de projeto (aba Projetos) ainda não entram na agenda: para vê-los aqui, crie um evento do tipo "Marco de entrega".</p>
    </div>
  )
}
