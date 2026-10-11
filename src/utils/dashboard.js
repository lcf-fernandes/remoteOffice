// Commit 20 — indicadores do dashboard. Usam as MESMAS regras dos alertas e dos módulos (nada é inventado ou duplicado).
import { daysBetween } from './proposals.js'
import { isOpenProject } from './projects.js'
import { isOpen } from './tasks.js'

export function dashboardStats({ tasks = [], projects = [], now = new Date() } = {}) {
  const open = projects.filter(isOpenProject)
  return {
    openTasks: tasks.filter(isOpen).length,
    overdueTasks: tasks.filter((t) => isOpen(t) && t.due && daysBetween(now, t.due) < 0).length, // mesmo cálculo do alerta "Tarefa atrasada"
    activeProjects: open.length,
    projectsDueIn7Days: open.filter((p) => p.dueDate && daysBetween(now, p.dueDate) >= 0 && daysBetween(now, p.dueDate) <= 7).length, // vencidos NÃO entram aqui
  }
}

// Área de trabalho vazia = nenhum registro em nenhum módulo (e todas as fontes carregadas): mostra o guia de início.
export const isWorkspaceEmpty = (counts) => Object.values(counts).every((n) => n === 0)

export const SOURCE_LABELS = { tasks: 'tarefas', projects: 'projetos', proposals: 'propostas', transactions: 'lançamentos' }
// Resume o estado das fontes dos alertas: ainda carregando? alguma falhou?
export function sourcesState(sources) {
  const failed = Object.entries(sources).filter(([, s]) => s === 'error').map(([k]) => SOURCE_LABELS[k] ?? k)
  const loading = Object.values(sources).some((s) => s === 'loading')
  return { failed, loading, ready: !loading && failed.length === 0 }
}
