import { useMemo, useState } from 'react'
import { BellRing, Plus } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { Input, Select } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { useProposals } from './ProposalsProvider.jsx'
import { useProposalEditor } from './ProposalEditor.jsx'
import useFollowUpDays from './useFollowUpDays.js'
import { useClients } from '../clients/ClientsProvider.jsx'
import { proposalErrorMessage } from '../../services/proposals.js'
import { FOLLOW_UP_DAY_OPTIONS, PROPOSAL_VIEWS, filterProposals, followUpReason, followUpRuleText, pipelineTotals, sortProposals } from '../../utils/proposals.js'
import { formatDate, formatMoney, relativeDay } from '../../utils/format.js'

export function FollowUpBadge({ reason }) {
  if (!reason) return null
  return <span className="badge badge--warn"><BellRing size={12} aria-hidden="true" />&nbsp;{reason.text}</span>
}

export default function ProposalsPage() {
  const { status, proposals, error, retry } = useProposals()
  const { byId: clientsById } = useClients()
  const editor = useProposalEditor()
  const [days, setDays] = useFollowUpDays()
  const [filters, setFilters] = useState({ view: 'open', search: '' })
  const visible = useMemo(() => sortProposals(filterProposals(proposals, filters, clientsById)), [proposals, filters, clientsById])
  const totals = useMemo(() => pipelineTotals(proposals), [proposals])
  const totalEntries = Object.entries(totals)

  return (
    <div className="center__inner">
      <header className="dash-head">
        <h1 className="page-title">Comercial</h1>
        <Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Nova proposta</Button>
      </header>

      <div className="stats stats--2">
        <div><dt>Aguardando resposta</dt><dd>{proposals.filter((p) => ['sent', 'negotiation'].includes(p.status)).length}</dd></div>
        <div>
          <dt>Valor aguardando resposta</dt>
          <dd className="stats__money">{totalEntries.length ? totalEntries.map(([cur, v]) => <span key={cur}>{formatMoney(v, cur)}</span>) : '—'}</dd>
        </div>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label="Status">
          {PROPOSAL_VIEWS.map((v) => <button key={v.id} type="button" className="chip" aria-pressed={filters.view === v.id} onClick={() => setFilters((f) => ({ ...f, view: v.id }))}>{v.label}</button>)}
        </div>
        <div className="filters__row filters__row--2">
          <Input label="Buscar" type="search" placeholder="Título, resumo, cliente ou próxima ação" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <Select label="Sem retorno após" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} options={FOLLOW_UP_DAY_OPTIONS.map((n) => ({ value: String(n), label: `${n} dias` }))} />
        </div>
        <p className="card__hint">{followUpRuleText(days)} Esta configuração fica salva neste navegador.</p>
      </div>

      {status === 'loading' && <LoadingState label="Carregando propostas…" />}
      {status === 'error' && <ErrorState title="Não foi possível carregar as propostas" onRetry={retry}>{proposalErrorMessage(error)}</ErrorState>}
      {status === 'ready' && visible.length === 0 && (
        proposals.length === 0
          ? <EmptyState title="Nenhuma proposta ainda" action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>Criar a primeira proposta</Button>}>Acompanhe cada oportunidade do rascunho até o resultado.</EmptyState>
          : <EmptyState title="Nenhuma proposta encontrada">Ajuste o status ou a busca.</EmptyState>
      )}
      {status === 'ready' && visible.length > 0 && (
        <ul className="plist">
          {visible.map((p) => {
            const reason = followUpReason(p, { days })
            return (
              <li key={p.id} className="plist__row">
                <div className="plist__main">
                  <a href={`#/comercial/${p.id}`} className="pcard__title">{p.title}</a>
                  <p className="row__meta">
                    {clientsById[p.clientId]?.name ?? 'Cliente removido'} · <strong>{formatMoney(p.amount, p.currency)}</strong>
                    {p.nextAction || p.nextActionDate ? ` · próxima ação: ${p.nextAction || '—'}${p.nextActionDate ? ` (${formatDate(p.nextActionDate)}, ${relativeDay(p.nextActionDate)})` : ''}` : ''}
                  </p>
                  {reason && <p><FollowUpBadge reason={reason} /></p>}
                </div>
                <StatusBadge status={p.status} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
