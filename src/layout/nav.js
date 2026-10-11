import { LayoutTemplate, Timer, LayoutDashboard, CheckSquare, Users, FolderKanban, CalendarDays, Handshake, Wallet, StickyNote, Settings } from 'lucide-react'

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare, commit: 10 },
  { id: 'clientes', label: 'Clientes', icon: Users, commit: 11 },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban, commit: 12 },
  { id: 'modelos', label: 'Modelos', icon: LayoutTemplate, commit: 19 },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, commit: 13 },
  { id: 'comercial', label: 'Comercial', icon: Handshake, commit: 14 },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, commit: 15 },
  { id: 'tempo', label: 'Tempo', icon: Timer, commit: 16 },
  { id: 'notas', label: 'Notas', icon: StickyNote, commit: 17 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, commit: 18 },
]

export const QUICK_ACTIONS = [
  { id: 'tarefa', label: 'Nova tarefa', commit: 10 },
  { id: 'cliente', label: 'Novo cliente', commit: 11 },
  { id: 'projeto', label: 'Novo projeto', commit: 12 },
  { id: 'evento', label: 'Novo evento', commit: 13 },
  { id: 'proposta', label: 'Nova proposta', commit: 14 },
  { id: 'receita', label: 'Nova receita', commit: 15 },
  { id: 'despesa', label: 'Nova despesa', commit: 15 },
  { id: 'tempo', label: 'Registro de tempo', commit: 16 },
  { id: 'nota', label: 'Nova nota', commit: 17 },
  { id: 'registro', label: 'Registro de trabalho', commit: 17 },
]
