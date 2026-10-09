// DADOS DE DEMONSTRAÇÃO — somente desenvolvimento. Nada aqui é persistido nem é dado real.
// Serão substituídos por serviços do Firestore (commits 10+). Mantidos isolados nesta pasta.
const day = (offset, hour = 0, min = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(hour, min, 0, 0); return d.toISOString()
}

export const demo = {
  tasks: [
    { id: 't1', title: 'Fechar corte final do vídeo institucional', status: 'in_progress', priority: 'high', due: day(0), project: 'Vídeo institucional' },
    { id: 't2', title: 'Revisar layout responsivo do site', status: 'todo', priority: 'high', due: day(0), project: 'Site da agência' },
    { id: 't3', title: 'Responder dúvidas do cliente sobre o escopo', status: 'waiting', priority: 'medium', due: day(1), project: 'App de agendamento' },
    { id: 't4', title: 'Exportar legendas em .srt', status: 'todo', priority: 'low', due: day(-1), project: 'Vídeo institucional' },
    { id: 't5', title: 'Configurar deploy de homologação', status: 'backlog', priority: 'medium', due: day(4), project: 'App de agendamento' },
  ],
  agenda: [
    { id: 'e1', title: 'Reunião de alinhamento', start: day(0, 10, 0), end: day(0, 10, 45) },
    { id: 'e2', title: 'Edição: bloco de foco', start: day(0, 14, 0), end: day(0, 16, 30) },
    { id: 'e3', title: 'Call de proposta', start: day(0, 17, 0), end: day(0, 17, 30) },
  ],
  projects: [
    { id: 'p1', name: 'Vídeo institucional', client: 'Cliente A', status: 'review', progress: 80, due: day(2), attention: 'Aprovação do cliente pendente' },
    { id: 'p2', name: 'Site da agência', client: 'Cliente B', status: 'active', progress: 45, due: day(9) },
    { id: 'p3', name: 'App de agendamento', client: 'Cliente C', status: 'waiting_client', progress: 30, due: day(14), attention: 'Aguardando retorno há 5 dias' },
  ],
  proposals: [
    { id: 'pr1', title: 'Redesign de landing page', client: 'Cliente D', status: 'sent', amount: 4200, currency: 'BRL', followUp: day(0) },
    { id: 'pr2', title: 'Pacote de 6 vídeos curtos', client: 'Cliente E', status: 'negotiation', amount: 3600, currency: 'BRL', followUp: day(3) },
  ],
  payments: [
    { id: 'tx1', description: 'Parcela 2/3 — Site da agência', status: 'pending', amount: 1800, currency: 'BRL', due: day(2) },
    { id: 'tx2', description: 'Entrega final — Vídeo institucional', status: 'overdue', amount: 2500, currency: 'BRL', due: day(-3) },
  ],
}
