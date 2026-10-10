// DADOS DE DEMONSTRAÇÃO — somente desenvolvimento. Nada aqui é persistido nem é dado real.
// Serão substituídos por serviços do Firestore (commits 10+). Mantidos isolados nesta pasta.
const day = (offset, hour = 0, min = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(hour, min, 0, 0); return d.toISOString()
}

export const demo = {
  proposals: [
    { id: 'pr1', title: 'Redesign de landing page', client: 'Cliente D', status: 'sent', amount: 4200, currency: 'BRL', followUp: day(0) },
    { id: 'pr2', title: 'Pacote de 6 vídeos curtos', client: 'Cliente E', status: 'negotiation', amount: 3600, currency: 'BRL', followUp: day(3) },
  ],
  payments: [
    { id: 'tx1', description: 'Parcela 2/3 — Site da agência', status: 'pending', amount: 1800, currency: 'BRL', due: day(2) },
    { id: 'tx2', description: 'Entrega final — Vídeo institucional', status: 'overdue', amount: 2500, currency: 'BRL', due: day(-3) },
  ],
}
