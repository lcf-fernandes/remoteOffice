import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Input, Select } from '../../components/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useTransactions } from './TransactionsProvider.jsx'
import { useTransactionEditor } from './TransactionEditor.jsx'
import { markTransactionPaid, transactionErrorMessage } from '../../services/transactions.js'
import {
  OVERDUE_RULE, PERIOD_OPTIONS, PERIOD_RULE, STATUS_RULES, TX_FILTER_STATUS_OPTIONS, TX_TYPE_LABEL, effectiveStatus, filterTransactions, sortTransactions, summarize,
} from '../../utils/finance.js'
import { CURRENCY_OPTIONS } from '../../utils/proposals.js'
import { dateToInput, inputToDate } from '../../utils/tasks.js'
import { formatDate, formatMoney, relativeDay } from '../../utils/format.js'
import useIncremental from '../../components/useIncremental.js'
import ShowMore from '../../components/ShowMore.jsx'

const STATUS_BADGE = {
  planned: ['neutral', () => 'Prevista'],
  pending: ['warn', () => 'Pendente'],
  overdue: ['danger', () => 'Vencida'],
  paid: ['ok', (t) => (t.type === 'income' ? 'Recebida' : 'Paga')],
  cancelled: ['neutral', () => 'Cancelada'],
}
export function TxStatusBadge({ tx, now }) {
  const eff = effectiveStatus(tx, now)
  const [tone, label] = STATUS_BADGE[eff]
  return <span className={`badge badge--${tone}`}>{label(tx)}</span>
}

const money = (v, cur) => (v ? formatMoney(v, cur) : '—')

export default function FinancePage({ openId = null }) {
  const { user } = useAuth()
  const { status, transactions, error, retry } = useTransactions()
  const { byId: clientsById } = useClients()
  const { byId: projectsById } = useProjects()
  const editor = useTransactionEditor()
  const [filters, setFilters] = useState({ period: 'month', status: '', type: '', currency: '', search: '' })
  const [payTx, setPayTx] = useState(null)
  const [payDate, setPayDate] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const now = new Date()
  const [missing, setMissing] = useState(false)

  // Link direto (#/financeiro/{id}, usado pelos alertas): abre o lançamento e limpa o endereço.
  useEffect(() => {
    if (!openId || status !== 'ready') return
    const tx = transactions.find((t) => t.id === openId)
    if (tx) { editor.openEdit(tx); setMissing(false) } else setMissing(true)
    window.location.replace('#/financeiro')
  }, [openId, status, transactions]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => sortTransactions(filterTransactions(transactions, filters)), [transactions, filters])
  const inc = useIncremental(visible, JSON.stringify(filters))
  const summary = useMemo(() => summarize(visible), [visible])
  const currencies = Object.keys(summary).sort()
  const set = (f) => (e) => setFilters((x) => ({ ...x, [f]: e.target.value }))

  function openPay(t) { setPayTx(t); setPayDate(dateToInput(new Date())); setPayError('') }
  async function confirmPay() {
    const date = payDate ? inputToDate(payDate) : null
    if (!date) return setPayError('Informe uma data de pagamento válida.')
    setPaying(true); setPayError('')
    try { await markTransactionPaid(user.uid, payTx.id, date); setPayTx(null) }
    catch (err) { setPayError(transactionErrorMessage(err)) }
    setPaying(false)
  }

  return (
    <div className="center__inner">
      <header className="dash-head">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>Registro e acompanhamento. O app não processa pagamentos nem se conecta a bancos.</p>
        </div>
        <div className="actions">
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew({ type: 'income' })}>Nova receita</Button>
          <Button icon={Plus} onClick={() => editor.openNew({ type: 'expense' })}>Nova despesa</Button>
        </div>
      </header>

      <div className="filters">
        <div className="chips" role="group" aria-label="Período">
          {PERIOD_OPTIONS.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={filters.period === p.id} onClick={() => setFilters((x) => ({ ...x, period: p.id }))}>{p.label}</button>)}
        </div>
        <div className="filters__row filters__row--4">
          <Select label="Status" value={filters.status} onChange={set('status')} options={TX_FILTER_STATUS_OPTIONS} />
          <Select label="Tipo" value={filters.type} onChange={set('type')} options={[{ value: '', label: 'Todos' }, { value: 'income', label: 'Receitas' }, { value: 'expense', label: 'Despesas' }]} />
          <Select label="Moeda" value={filters.currency} onChange={set('currency')} options={[{ value: '', label: 'Todas' }, ...CURRENCY_OPTIONS]} />
          <Input label="Buscar" type="search" placeholder="Descrição, categoria, notas" value={filters.search} onChange={set('search')} />
        </div>
      </div>

      {missing && <ErrorState title="Lançamento não encontrado">Ele pode ter sido excluído em outro aparelho.</ErrorState>}
      {status === 'loading' && <LoadingState label="Carregando lançamentos…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar o financeiro" onRetry={retry}>{transactionErrorMessage(error)}</ErrorState>}

      {status === 'ready' && currencies.map((cur) => {
        const s = summary[cur]
        return (
          <section key={cur} className="card" aria-labelledby={`fin-${cur}`}>
            <h2 className="card__title" id={`fin-${cur}`}>Totais em {cur}</h2>
            <div className="table-scroll" tabIndex={0} role="region" aria-label={`Tabela de totais em ${cur}`}>
              <table className="fin-table">
                <caption className="sr-only">Totais em {cur} para os filtros selecionados</caption>
                <thead><tr><th scope="col"><span className="sr-only">Tipo</span></th><th scope="col">Recebido / pago</th><th scope="col">Pendente</th><th scope="col">Vencido</th><th scope="col">Previsto</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Receitas</th><td>{money(s.income.paid, cur)}</td><td>{money(s.income.pending, cur)}</td><td className={s.income.overdue ? 'is-late' : ''}>{money(s.income.overdue, cur)}</td><td>{money(s.income.planned, cur)}</td></tr>
                  <tr><th scope="row">Despesas</th><td>{money(s.expense.paid, cur)}</td><td>{money(s.expense.pending, cur)}</td><td className={s.expense.overdue ? 'is-late' : ''}>{money(s.expense.overdue, cur)}</td><td>{money(s.expense.planned, cur)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="fin-balance">Saldo realizado (recebido − pago): <strong>{formatMoney(s.balance, cur)}</strong></p>
          </section>
        )
      })}

      {status === 'ready' && transactions.length > 0 && (
        <details className="card">
          <summary className="card__title">Como os totais são calculados</summary>
          <ul className="rules">
            <li>Cada moeda tem seus próprios totais; valores de moedas diferentes <strong>nunca são somados nem convertidos</strong>.</li>
            <li>{PERIOD_RULE}</li>
            {Object.values(STATUS_RULES).map((r) => <li key={r}>{r}</li>)}
            <li>O saldo realizado considera só o que já foi pago/recebido; previstos e pendentes não entram.</li>
          </ul>
        </details>
      )}

      {status === 'ready' && visible.length === 0 && (
        transactions.length === 0
          ? <EmptyState title="Nenhum lançamento ainda" action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew({ type: 'income' })}>Registrar a primeira receita</Button>}>Registre receitas e despesas para acompanhar o que entrou, o que falta receber e o que precisa pagar.</EmptyState>
          : <EmptyState title="Nenhum lançamento encontrado">Ajuste o período ou os filtros.</EmptyState>
      )}

      {status === 'ready' && visible.length > 0 && (
        <>
<ul className="plist">
          {inc.shown.map((t) => {
            const eff = effectiveStatus(t, now)
            const canPay = t.status === 'planned' || t.status === 'pending'
            return (
              <li key={t.id} className="plist__row">
                <div className="plist__main">
                  <button type="button" className={`linklike ${t.status === 'cancelled' ? 'is-struck' : ''}`} onClick={() => editor.openEdit(t)}>{t.description}</button>
                  <p className="row__meta">
                    <strong>{TX_TYPE_LABEL[t.type]}</strong>{t.category ? ` · ${t.category}` : ''}
                    {t.clientId && clientsById[t.clientId] ? ` · ${clientsById[t.clientId].name}` : ''}
                    {t.projectId && projectsById[t.projectId] ? ` · ${projectsById[t.projectId].name}` : ''}
                  </p>
                  <p className={`row__meta ${eff === 'overdue' ? 'is-late' : ''}`}>
                    {t.status === 'paid' && t.paidDate ? `${t.type === 'income' ? 'recebida' : 'paga'} em ${formatDate(t.paidDate, { day: '2-digit', month: 'short', year: 'numeric' })}` : `vence ${formatDate(t.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })} (${relativeDay(t.dueDate)})`}
                  </p>
                </div>
                <div className="plist__side">
                  <strong className={t.status === 'cancelled' ? 'is-struck' : ''}>{t.type === 'income' ? '+' : '−'} {formatMoney(t.amount, t.currency)}</strong>
                  <TxStatusBadge tx={t} now={now} />
                  {canPay && <Button icon={Check} onClick={() => openPay(t)}>{t.type === 'income' ? 'Marcar recebido' : 'Marcar pago'}</Button>}
                </div>
              </li>
            )
          })}
        </ul>
<ShowMore inc={inc} noun="lançamentos" />
</>
      )}
      <p className="card__hint">{OVERDUE_RULE}</p>

      <Dialog
        open={!!payTx}
        title={payTx?.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
        onClose={() => setPayTx(null)}
        actions={<><Button variant="ghost" onClick={() => setPayTx(null)} disabled={paying}>Cancelar</Button><Button variant="primary" onClick={confirmPay} loading={paying}>Confirmar</Button></>}
      >
        <p>“{payTx?.description}” — {payTx ? formatMoney(payTx.amount, payTx.currency) : ''}. Isto só registra o pagamento; nenhum dinheiro é movimentado pelo app.</p>
        <Input label="Data do pagamento" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} error={payError} />
      </Dialog>
    </div>
  )
}
