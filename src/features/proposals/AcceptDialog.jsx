import { useState } from 'react'
import Button from '../../components/Button.jsx'
import Dialog from '../../components/Dialog.jsx'
import { Select } from '../../components/Field.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useProjects } from '../projects/ProjectsProvider.jsx'
import { useProjectEditor } from '../projects/ProjectEditor.jsx'
import { changeProposalStatus, linkProposalProject, proposalErrorMessage } from '../../services/proposals.js'

// Nada é criado sem escolha explícita: cada botão abaixo é a confirmação da ação que descreve.
// statusChange = true  → a proposta ainda não está aceita (o botão também a marca como aceita).
// statusChange = false → já aceita; só vincula/cria projeto.
export default function AcceptDialog({ open, proposal, statusChange, onClose }) {
  const { user } = useAuth()
  const { projects } = useProjects()
  const projectEditor = useProjectEditor()
  const [projectId, setProjectId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const candidates = [...projects]
    .filter((p) => !['archived', 'completed'].includes(p.status))
    .sort((a, b) => Number(b.clientId === proposal?.clientId) - Number(a.clientId === proposal?.clientId) || a.name.localeCompare(b.name, 'pt-BR'))
  const options = [{ value: '', label: 'Escolha um projeto…' }, ...candidates.map((p) => ({ value: p.id, label: p.name }))]

  async function run(fn, { closeAfter = true } = {}) {
    setBusy(true); setError('')
    try { await fn(); if (closeAfter) onClose() }
    catch (err) { setError(proposalErrorMessage(err)) }
    setBusy(false)
  }

  const markOnly = () => run(() => changeProposalStatus(user.uid, proposal, 'accepted'))
  const linkExisting = () => run(() => (statusChange
    ? changeProposalStatus(user.uid, proposal, 'accepted', { projectId })
    : linkProposalProject(user.uid, proposal.id, projectId)))
  const createNew = () => run(async () => {
    if (statusChange) await changeProposalStatus(user.uid, proposal, 'accepted')
    onClose()
    // Abre o formulário já preenchido; o projeto só é criado se você salvar lá. Ao salvar, vincula à proposta.
    projectEditor.openNew(
      { name: proposal.title, clientId: proposal.clientId ?? '', description: proposal.summary },
      (newProjectId) => linkProposalProject(user.uid, proposal.id, newProjectId)
    )
  }, { closeAfter: false })

  return (
    <Dialog open={open} wide title={statusChange ? 'Proposta aceita' : 'Projeto da proposta'} onClose={onClose}
      actions={<Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>}>
      <p>
        {statusChange
          ? <>Marcar “{proposal?.title}” como <strong>aceita</strong>. Escolha o que fazer a seguir — nenhum projeto é criado sem a sua confirmação.</>
          : <>Escolha como ligar “{proposal?.title}” a um projeto — nenhum projeto é criado sem a sua confirmação.</>}
      </p>
      <div className="accept">
        {statusChange && <Button onClick={markOnly} loading={busy}>Apenas marcar como aceita</Button>}
        <div className="accept__row">
          <Select label="Vincular a um projeto existente" value={projectId} onChange={(e) => setProjectId(e.target.value)} options={options} />
          <Button onClick={linkExisting} disabled={!projectId || busy}>{statusChange ? 'Aceitar e vincular' : 'Vincular'}</Button>
        </div>
        <Button variant="primary" onClick={createNew} loading={busy}>{statusChange ? 'Aceitar e criar projeto…' : 'Criar projeto a partir da proposta…'}</Button>
        <p className="card__hint">“Criar projeto” abre o formulário já preenchido; o projeto só existe depois que você salvar.</p>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
    </Dialog>
  )
}
