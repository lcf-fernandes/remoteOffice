import { useMemo, useState } from 'react'
import { Play, Plus, Square, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Checkbox, Input, Select } from '../../components/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useTasks } from '../tasks/TasksProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTime } from './TimeProvider.jsx'
import { useEntryEditor } from './EntryEditor.jsx'
import useNow from './useNow.js'
import { discardTimer, startTimer, stopTimer, timeErrorMessage } from '../../services/time.js'
import { dateTimeToInput, inputToDateTime } from '../../utils/events.js'
import { isOpen } from '../../utils/tasks.js'
import { MAX_ENTRY_SECONDS, STALE_TIMER_SECONDS, TIME_PERIODS, buildReport, durationSeconds, filterEntries, formatClock, formatDuration, totals } from '../../utils/time.js'

const hm = (d) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
const REPORTS = [{ id: 'day', label: 'Por dia' }, { id: 'task', label: 'Por tarefa' }, { id: 'project', label: 'Por projeto' }, { id: 'category', label: 'Por categoria' }]

export default function TimePage() {
  const time = useTime()
  const { tasks } = useTasks()
  const { projects, byId: projectsById } = useProjects()
  const editor = useEntryEditor()
  const [period, setPeriod] = useState('week')
  const [report, setReport] = useState('day')
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])
  const entries = useMemo(() => filterEntries(time.entries, period), [time.entries, period])
  const rows = useMemo(() => buildReport(entries, report, { tasksById, projectsById }), [entries, report, tasksById, projectsById])
  const sum = totals(entries)

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">Tempo</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>Tempo registrado não é, por si só, tempo faturável: nenhuma cobrança é gerada.</p>
        </div>
        <Button icon={Plus} onClick={() => editor.openNew()}>Registro manual</Button>
      </header>

      {time.status === 'loading' && <LoadingState label="Carregando registros de tempo…" />}
      {time.status === 'error' && <ErrorState title="Não foi possível carregar o tempo" onRetry={time.retry}>{timeErrorMessage(time.error)}</ErrorState>}
      {time.status === 'ready' && <TimerCard tasks={tasks} tasksById={tasksById} projects={projects} projectsById={projectsById} />}

      {time.status === 'ready' && (
        <>
          <div className="chips" role="group" aria-label="Período">
            {TIME_PERIODS.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
          </div>

          <Card title="Relatório" id="t-report" hint="Cada registro conta no dia/mês em que começou. O cronômetro em andamento só entra depois de parado.">
            <div className="chips" role="group" aria-label="Agrupar por">
              {REPORTS.map((r) => <button key={r.id} type="button" className="chip" aria-pressed={report === r.id} onClick={() => setReport(r.id)}>{r.label}</button>)}
            </div>
            {rows.length === 0 ? <EmptyState title="Sem registros neste período" /> : (
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela do relatório de tempo">
                <table className="fin-table">
                  <caption className="sr-only">Tempo registrado {REPORTS.find((r) => r.id === report).label.toLowerCase()}</caption>
                  <thead><tr><th scope="col" style={{ textAlign: 'left' }}>{report === 'day' ? 'Dia' : report === 'task' ? 'Tarefa' : report === 'project' ? 'Projeto' : 'Categoria'}</th><th scope="col">Registros</th><th scope="col">Tempo registrado</th><th scope="col">Marcado como faturável</th></tr></thead>
                  <tbody>
                    {rows.map((r) => <tr key={r.key}><th scope="row" style={{ whiteSpace: 'normal' }}>{r.label}</th><td>{r.count}</td><td>{formatDuration(r.seconds)}</td><td>{r.billableSeconds ? formatDuration(r.billableSeconds) : '—'}</td></tr>)}
                  </tbody>
                  <tfoot><tr><th scope="row" style={{ textAlign: 'left' }}>Total do período</th><td>{sum.count}</td><td><strong>{formatDuration(sum.seconds)}</strong></td><td>{sum.billableSeconds ? formatDuration(sum.billableSeconds) : '—'}</td></tr></tfoot>
                </table>
              </div>
            )}
            <p className="card__hint">“Faturável” é uma marcação manual em cada registro; não gera cobrança nem valor em dinheiro.</p>
          </Card>

          <Card title="Registros" id="t-list">
            {entries.length === 0 ? <EmptyState title="Nenhum registro neste período">Inicie o cronômetro ou use “Registro manual”.</EmptyState> : (
              <ul className="rows">
                {entries.map((e) => (
                  <li key={e.id} className="row">
                    <div>
                      <button type="button" className="linklike" onClick={() => editor.openEdit(e)}>{e.description || (e.taskId && tasksById[e.taskId]?.title) || 'Sem descrição'}</button>
                      <p className="row__meta">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(e.start)} · {hm(e.start)}–{hm(e.end)}
                        {e.taskId ? ` · ${tasksById[e.taskId]?.title ?? '(tarefa excluída)'}` : ''}
                        {(e.taskId ? tasksById[e.taskId]?.projectId : e.projectId) ? ` · ${projectsById[e.taskId ? tasksById[e.taskId]?.projectId : e.projectId]?.name ?? '(projeto excluído)'}` : ''}
                      </p>
                      <p className="row__meta">{e.source === 'manual' ? 'manual' : 'cronômetro'}{e.revisionCount ? ` · ajustado ${e.revisionCount}×` : ''}{e.billable ? ' · marcado como faturável' : ''}</p>
                    </div>
                    <strong>{formatDuration(e.durationSeconds)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function TimerCard({ tasks, tasksById, projects, projectsById }) {
  const { user } = useAuth()
  const { timer } = useTime()
  const now = useNow(!!timer)
  const [form, setForm] = useState({ taskId: '', projectId: '', description: '', billable: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stopping, setStopping] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  const taskOptions = [{ value: '', label: 'Sem tarefa' }, ...tasks.filter(isOpen).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')).map((t) => ({ value: t.id, label: t.title }))]
  const projectOptions = [{ value: '', label: 'Sem projeto' }, ...projects.filter((p) => !['archived', 'completed'].includes(p.status)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => ({ value: p.id, label: p.name }))]
  const chosenTask = tasksById[form.taskId]

  async function start() {
    setBusy(true); setError('')
    try {
      await startTimer(user.uid, { description: form.description, taskId: form.taskId || null, projectId: chosenTask ? chosenTask.projectId ?? null : form.projectId || null, billable: form.billable })
      setForm({ taskId: '', projectId: '', description: '', billable: false })
    } catch (err) { setError(timeErrorMessage(err)) }
    setBusy(false)
  }
  async function discard() {
    setBusy(true); setError('')
    try { await discardTimer(user.uid); setDiscarding(false) } catch (err) { setError(timeErrorMessage(err)); setDiscarding(false) }
    setBusy(false)
  }

  if (!timer) {
    return (
      <Card title="Cronômetro" id="t-timer" hint="Nenhum cronômetro ativo. Só pode haver um por vez, em todos os seus aparelhos.">
        <div className="form">
          <Input label="Descrição (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="form__row">
            <Select label="Tarefa (opcional)" value={form.taskId} onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))} options={taskOptions} />
            <Select label="Projeto (opcional)" value={chosenTask ? chosenTask.projectId ?? '' : form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} options={projectOptions} disabled={!!chosenTask} />
          </div>
          {chosenTask && <p className="card__hint">O projeto vem da tarefa escolhida{chosenTask.projectId ? '' : ' (esta tarefa não tem projeto)'}.</p>}
          <Checkbox label="Marcar como faturável (só uma marcação; não gera cobrança)" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} />
          {error && <p className="field__error" role="alert">{error}</p>}
          <div><Button variant="primary" icon={Play} onClick={start} loading={busy}>Iniciar cronômetro</Button></div>
        </div>
      </Card>
    )
  }

  const elapsed = Math.max(0, (now.getTime() - timer.start.getTime()) / 1000)
  const projectName = timer.projectId ? projectsById[timer.projectId]?.name : null
  return (
    <Card title="Cronômetro ativo" id="t-timer">
      <p className="timer__clock" role="timer" aria-label={`Tempo decorrido ${formatClock(elapsed)}`}>{formatClock(elapsed)}</p>
      <p className="row__meta">
        Iniciado às {hm(timer.start)}
        {timer.description ? ` · ${timer.description}` : ''}
        {timer.taskId ? ` · ${tasksById[timer.taskId]?.title ?? '(tarefa excluída)'}` : ''}
        {projectName ? ` · ${projectName}` : ''}{timer.billable ? ' · marcado como faturável' : ''}
      </p>
      {elapsed > STALE_TIMER_SECONDS && (
        <p className="field__error" role="status">Este cronômetro está ativo há mais de {Math.floor(STALE_TIMER_SECONDS / 3600)} horas. Ao parar, confira o horário de término{elapsed > MAX_ENTRY_SECONDS ? ' (um registro pode ter no máximo 24 h: informe o fim correto)' : ''}.</p>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}
      <div className="actions">
        <Button variant="primary" icon={Square} onClick={() => setStopping(true)}>Parar e registrar</Button>
        <Button variant="ghost" icon={Trash2} onClick={() => setDiscarding(true)}>Descartar</Button>
      </div>
      <StopDialog key={String(stopping)} open={stopping} timer={timer} onClose={() => setStopping(false)} />
      <Dialog open={discarding} title="Descartar cronômetro?" onClose={() => setDiscarding(false)}
        actions={<><Button variant="ghost" onClick={() => setDiscarding(false)} disabled={busy}>Cancelar</Button><Button variant="primary" onClick={discard} loading={busy}>Descartar</Button></>}>
        <p>O tempo decorrido ({formatClock(elapsed)}) <strong>não será registrado</strong>. Use isto só para cronômetros iniciados por engano.</p>
      </Dialog>
    </Card>
  )
}

function StopDialog({ open, timer, onClose }) {
  const { user } = useAuth()
  const [endStr, setEndStr] = useState(() => dateTimeToInput(new Date()))
  const [touched, setTouched] = useState(false)
  const [description, setDescription] = useState(timer.description)
  const [billable, setBillable] = useState(timer.billable)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setError('')
    const now = new Date()
    const end = touched ? inputToDateTime(endStr) : now // sem mexer no campo, usa o instante exato do clique
    if (!end) return setError('Informe um horário de término válido.')
    if (end <= timer.start) return setError('O fim deve ser depois do início do cronômetro.')
    if (end.getTime() > now.getTime() + 60000) return setError('O fim não pode estar no futuro.')
    if (durationSeconds(timer.start, end) > MAX_ENTRY_SECONDS) return setError('O cronômetro está ativo há mais de 24 horas: informe o horário de término correto para o registro ter no máximo 24 h.')
    if (description.length > 200) return setError('A descrição deve ter no máximo 200 caracteres.')
    setBusy(true)
    try { await stopTimer(user.uid, { end, description, billable }); onClose() }
    catch (err) { setError(timeErrorMessage(err)); setBusy(false) }
  }

  return (
    <Dialog open={open} title="Parar e registrar" onClose={onClose}
      actions={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button><Button variant="primary" onClick={confirm} loading={busy}>Registrar</Button></>}>
      <p>Início: <strong>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(timer.start)}</strong></p>
      <Input label="Fim (deixe como está para usar agora)" type="datetime-local" value={endStr} onChange={(e) => { setEndStr(e.target.value); setTouched(true) }} />
      <Input label="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Checkbox label="Marcar como faturável (só uma marcação; não gera cobrança)" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
      {error && <p className="field__error" role="alert">{error}</p>}
    </Dialog>
  )
}
