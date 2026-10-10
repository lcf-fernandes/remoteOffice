import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, PhoneCall, Trash2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Select } from '../../components/Field.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/states.jsx'
import { FollowUpBadge } from './ProposalsPage.jsx'
import AcceptDialog from './AcceptDialog.jsx'
import { useProposals } from './ProposalsProvider.jsx'
import { useProposalEditor } from './ProposalEditor.jsx'
import useFollowUpDays from './useFollowUpDays.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useClients } from '../clients/ClientsProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import {
  changeProposalStatus, deleteProposal, linkProposalProject, proposalErrorMessage, registerContact, subscribeToHistory,
} from '../../services/proposals.js'
import { PROPOSAL_STATUS_LABEL, PROPOSAL_STATUS_OPTIONS, followUpReason, followUpRuleText } from '../../utils/proposals.js'
import { formatDate, formatMoney, relativeDay } from '../../utils/format.js'

const dateTime = (d) => (d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) : 'agora')

export default function ProposalDetail({ id }) {
  const { user } = useAuth()
  const { status, byId, retry } = useProposals()
  const { byId: clientsById } = useClients()
  const { byId: projectsById } = useProjects()
  const editor = useProposalEditor()
  const [days] = useFollowUpDays()
  const proposal = byId?.[id]
  const [accept, setAccept] = useState(null) // { statusChange: boolean } | null
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  if (status === 'loading') return <div className="center__inner"><LoadingState label="Carregando proposta…" /></div>
  if (status === 'error') return <div className="center__inner"><ErrorState title="Não foi possível carregar a proposta" onRetry={retry} /></div>
  if (!proposal) return <div className="center__inner"><EmptyState title="Proposta não encontrada" action={<a href="#/comercial">Voltar para Comercial</a>}>Ela pode ter sido excluída.</EmptyState></div>

  const client = clientsById[proposal.clientId]
  const project = proposal.projectId ? projectsById[proposal.projectId] : null
  const reason = followUpReason(proposal, { days })
  const run = async (fn) => { setActionError(''); setBusy(true); try { await fn() } catch (err) { setActionError(proposalErrorMessage(err)) } setBusy(false) }

  function onStatus(next) {
    if (next === proposal.status) return
    if (next === 'accepted') setAccept({ statusChange: true })
    else run(() => changeProposalStatus(user.uid, proposal, next))
  }
  async function remove() {
    setBusy(true); setActionError('')
    try { await deleteProposal(user.uid, id); window.location.hash = '#/comercial' }
    catch (err) { setActionError(proposalErrorMessage(err)); setConfirmDelete(false); setBusy(false) }
  }

  return (
    <div className="center__inner">
      <a href="#/comercial" className="back"><ArrowLeft size={14} aria-hidden="true" /> Comercial</a>
      <header className="dash-head">
        <div>
          <h1 className="page-title">{proposal.title}</h1>
          <p className="dash-date" style={{ textTransform: 'none' }}>
            {client ? <a href={`#/clientes/${client.id}`}>{client.name}</a> : 'Cliente removido'} · <strong>{formatMoney(proposal.amount, proposal.currency)}</strong>
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </header>

      {reason && <section className="alerts" aria-label="Retorno pendente"><p><FollowUpBadge reason={reason} /></p><p>{followUpRuleText(days)}</p></section>}

      <div className="actions">
        <Button variant="primary" icon={Pencil} onClick={() => editor.openEdit(proposal)}>Editar</Button>
        <Button icon={PhoneCall} onClick={() => run(() => registerContact(user.uid, id))} loading={busy}>Registrar contato</Button>
        <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Excluir</Button>
        <div className="actions__select"><Select label="Status" value={proposal.status} onChange={(e) => onStatus(e.target.value)} options={PROPOSAL_STATUS_OPTIONS} /></div>
      </div>
      {actionError && <ErrorState title="Não foi possível concluir a ação">{actionError}</ErrorState>}

      <Card title="Resumo da proposta" id="pr-info">
        <dl className="detail">
          <div><dt>Valor</dt><dd>{formatMoney(proposal.amount, proposal.currency)}</dd></div>
          <div><dt>Moeda</dt><dd>{proposal.currency}</dd></div>
          <div><dt>Enviada em</dt><dd>{proposal.sentDate ? formatDate(proposal.sentDate, { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</dd></div>
          <div><dt>Validade</dt><dd>{proposal.validUntil ? `${formatDate(proposal.validUntil, { day: '2-digit', month: 'long', year: 'numeric' })} (${relativeDay(proposal.validUntil)})` : '—'}</dd></div>
          <div className="detail__wide"><dt>Próxima ação</dt><dd>{proposal.nextAction || proposal.nextActionDate ? `${proposal.nextAction || '—'}${proposal.nextActionDate ? ` (${formatDate(proposal.nextActionDate)}, ${relativeDay(proposal.nextActionDate)})` : ''}` : '—'}</dd></div>
          <div className="detail__wide"><dt>Resumo</dt><dd className="detail__text">{proposal.summary || '—'}</dd></div>
        </dl>
      </Card>

      {proposal.status === 'accepted' && (
        <Card title="Projeto" id="pr-proj">
          {project ? (
            <div className="row">
              <a className="pcard__title" href={`#/projetos/${project.id}`}>{project.name}</a>
              <Button variant="ghost" onClick={() => run(() => linkProposalProject(user.uid, id, null))} loading={busy}>Desvincular</Button>
            </div>
          ) : (
            <EmptyState title="Nenhum projeto vinculado" action={<Button variant="primary" onClick={() => setAccept({ statusChange: false })}>Vincular ou criar projeto</Button>}>Vincule a um projeto existente ou crie um novo a partir desta proposta.</EmptyState>
          )}
        </Card>
      )}

      <History uid={user.uid} id={id} />

      <AcceptDialog key={String(!!accept)} open={!!accept} proposal={proposal} statusChange={accept?.statusChange ?? false} onClose={() => setAccept(null)} />
      <Dialog open={confirmDelete} title="Excluir proposta?" onClose={() => setConfirmDelete(false)}
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</Button><Button variant="primary" onClick={remove} loading={busy}>Excluir</Button></>}>
        <p>“{proposal.title}” e o histórico de status serão excluídos para sempre. Projetos vinculados não são afetados.</p>
      </Dialog>
    </div>
  )
}

function History({ uid, id }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    return subscribeToHistory(uid, id, (items) => setState({ status: 'ready', items, error: null }), (error) => setState({ status: 'error', items: [], error }))
  }, [uid, id, attempt])
  const label = (h) => (h.kind === 'created' ? `Proposta criada como ${PROPOSAL_STATUS_LABEL[h.to] ?? h.to}` : h.kind === 'contact' ? 'Contato registrado' : `Status: ${PROPOSAL_STATUS_LABEL[h.from] ?? h.from} → ${PROPOSAL_STATUS_LABEL[h.to] ?? h.to}`)
  return (
    <Card title="Histórico" id="pr-hist">
      {state.status === 'loading' && <LoadingState label="Carregando histórico…" />}
      {state.status === 'error' && <ErrorState title="Não foi possível carregar o histórico" onRetry={() => setAttempt((n) => n + 1)}>{proposalErrorMessage(state.error)}</ErrorState>}
      {state.status === 'ready' && state.items.length === 0 && <EmptyState title="Sem registros" />}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="rows">{state.items.map((h) => <li key={h.id} className="row"><p>{label(h)}</p><span className="row__meta">{dateTime(h.at)}</span></li>)}</ul>
      )}
    </Card>
  )
}
