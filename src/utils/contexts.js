// Commit 18 — contextos de trabalho. Um contexto só REORGANIZA e FILTRA a apresentação dos mesmos dados
// (nenhum registro é copiado ou criado). Ele define quais blocos do dashboard ficam em destaque e em que ordem,
// como tarefas/projetos são filtrados e quais ações rápidas aparecem primeiro.
import { isOpenProject } from './projects.js'
import { isOpen } from './tasks.js'

export const CONTEXTS = {
  today: {
    label: 'Hoje',
    description: 'Prioridades gerais: agenda, tarefas, projetos, propostas e retomada.',
    primary: ['agenda', 'tasks', 'projects', 'proposals', 'resume'],
    taskProjectType: null,
    quickFirst: ['tarefa', 'evento', 'nota', 'tempo'],
  },
  development: {
    label: 'Desenvolvimento',
    description: 'Projetos técnicos, suas tarefas e links de repositório.',
    primary: ['projects', 'tasks', 'resume', 'agenda'],
    taskProjectType: 'development',
    quickFirst: ['tarefa', 'projeto', 'registro', 'tempo'],
  },
  editing: {
    label: 'Edição',
    description: 'Fila de vídeos, revisão e entrega.',
    primary: ['video', 'tasks', 'agenda', 'resume'],
    taskProjectType: 'editing',
    quickFirst: ['tarefa', 'tempo', 'evento', 'projeto'],
  },
  commercial: {
    label: 'Comercial',
    description: 'Propostas, follow-ups, próximas ações de clientes e recebimentos.',
    primary: ['proposals', 'finance', 'clients', 'agenda', 'tasks'],
    taskProjectType: null,
    quickFirst: ['proposta', 'cliente', 'receita', 'evento'],
  },
}

// Blocos em destaque (na ordem do contexto) e os demais (recolhidos), já sem os que o usuário ocultou.
export function layoutFor(contextId, allBlockIds, hidden = []) {
  const ctx = CONTEXTS[contextId] ?? CONTEXTS.today
  const visible = (id) => !hidden.includes(id)
  const primary = ctx.primary.filter((id) => allBlockIds.includes(id) && visible(id))
  const secondary = allBlockIds.filter((id) => !ctx.primary.includes(id) && visible(id))
  return { primary, secondary }
}

// Tarefas abertas filtradas pelo tipo de projeto do contexto (sem filtro = todas as abertas).
export function contextTasks(contextId, tasks, projectsById) {
  const type = (CONTEXTS[contextId] ?? CONTEXTS.today).taskProjectType
  const open = tasks.filter(isOpen)
  if (!type) return open
  return open.filter((t) => t.projectId && projectsById[t.projectId]?.type === type)
}

export const projectsOfType = (projects, type) => projects.filter((p) => isOpenProject(p) && p.type === type)

const REPO_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org', 'dev.azure.com', 'sr.ht']
export function isRepoLink(url) {
  try { const h = new URL(url).hostname.replace(/^www\./, ''); return REPO_HOSTS.some((r) => h === r || h.endsWith(`.${r}`)) } catch { return false }
}
export const repoLinks = (project) => project.links.filter(isRepoLink)

// Fases da "fila de vídeos" (projetos de edição em aberto).
export const VIDEO_PHASES = [
  { id: 'production', label: 'Em produção', statuses: ['planning', 'active'] },
  { id: 'review', label: 'Em revisão', statuses: ['review'] },
  { id: 'waiting', label: 'Aguardando cliente', statuses: ['waiting_client'] },
]
export function videoQueue(projects) {
  const editing = projectsOfType(projects, 'editing')
  return VIDEO_PHASES.map((phase) => ({
    ...phase,
    projects: editing.filter((p) => phase.statuses.includes(p.status)).sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity)),
  }))
}

// Ações rápidas: as do contexto primeiro (na ordem definida), depois as demais na ordem original.
export function orderQuickActions(actions, contextId) {
  const first = (CONTEXTS[contextId] ?? CONTEXTS.today).quickFirst
  const rank = (a) => { const i = first.indexOf(a.id); return i === -1 ? first.length : i }
  return actions.map((a, index) => ({ a, index })).sort((x, y) => rank(x.a) - rank(y.a) || x.index - y.index).map((x) => x.a)
}
