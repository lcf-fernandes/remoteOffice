import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp, allPaths, clearFailure, failAll, listDocs, readDoc, seedDoc } from './fake-firebase/store.js'
import { bootApp, day, mountApp, path, seedWorkspace } from './helpers.jsx'
import { startTimer } from '../../src/services/time.js'

const heading = (name) => screen.findByRole('heading', { level: 1, name }, { timeout: 8000 })
const topDialog = async () => { await screen.findAllByRole('dialog'); const all = screen.getAllByRole('dialog'); return within(all[all.length - 1]) }
const now = Timestamp.now()

function seedClient2() {
  seedDoc(path('clients', 'c2'), { name: 'Cliente Dois', company: '', email: '', phone: '', source: '', status: 'active', notes: '', nextAction: '', nextActionDate: null, createdAt: now, updatedAt: now })
  seedDoc(path('clients', 'c2', 'interactions', 'ci1'), { date: day(-1), type: 'email', summary: 'Contato', createdAt: now })
  seedDoc(path('tasks', 'tc'), { title: 'Tarefa do cliente 2', description: '', status: 'todo', priority: 'low', due: null, category: '', tags: [], clientId: 'c2', projectId: null, completedAt: null, createdAt: now, updatedAt: now })
  seedDoc(path('projects', 'pc'), { name: 'Projeto do cliente 2', description: '', clientId: 'c2', type: 'other', status: 'active', priority: 'low', startDate: null, dueDate: null, links: [], createdAt: now, updatedAt: now })
  seedDoc(path('transactions', 'xc'), { description: 'Cobrança do cliente 2', type: 'income', amount: 10, currency: 'BRL', status: 'pending', dueDate: day(5), paidDate: null, category: '', clientId: 'c2', projectId: null, notes: '', createdAt: now, updatedAt: now })
  seedDoc(path('notes', 'nc'), { title: 'Nota c2', content: 'x', tags: [], clientId: 'c2', projectId: null, taskId: null, createdAt: now, updatedAt: now })
  seedDoc(path('workLog', 'wc'), { date: day(-1), done: 'x', blockers: '', nextStep: '', clientId: 'c2', projectId: null, taskId: null, createdAt: now, updatedAt: now })
}
const seedAll = () => { seedWorkspace(); seedClient2() }

describe('exclusão com relacionamentos e dados históricos', () => {
  it('excluir cliente sem propostas: apaga cliente e interações e DESVINCULA (não apaga) o restante', async () => {
    bootApp({ hash: '#/clientes/c2', seed: seedAll })
    const user = userEvent.setup()
    await heading('Cliente Dois')
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(readDoc(path('clients', 'c2'))).toBeUndefined())
    expect(readDoc(path('clients', 'c2', 'interactions', 'ci1'))).toBeUndefined()
    for (const [col, id] of [['tasks', 'tc'], ['projects', 'pc'], ['transactions', 'xc'], ['notes', 'nc'], ['workLog', 'wc']]) {
      const d = readDoc(path(col, id))
      expect(d, `${col}/${id} deve continuar existindo`).toBeDefined()
      expect(d.clientId, `${col}/${id} deve ficar sem cliente`).toBeNull()
    }
    expect(window.location.hash).toBe('#/clientes')
  })

  it('excluir cliente COM propostas é bloqueado, com mensagem clara, e nada é apagado', async () => {
    bootApp({ hash: '#/clientes/c1', seed: seedAll })
    const user = userEvent.setup()
    await heading('Ana Souza')
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText(/Este cliente tem propostas/)).toBeTruthy()
    expect(readDoc(path('clients', 'c1'))).toBeDefined()
    expect(readDoc(path('tasks', 't1')).clientId).toBe('c1')
    expect(readDoc(path('clients', 'c1', 'interactions', 'i1'))).toBeDefined()
  })

  it('excluir projeto: apaga marcos e diário; tarefas, eventos, lançamentos e registros ficam, sem vínculo', async () => {
    bootApp({ hash: '#/projetos/p1', seed: seedAll })
    const user = userEvent.setup()
    await heading('Site da agência')
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(readDoc(path('projects', 'p1'))).toBeUndefined())
    expect(readDoc(path('projects', 'p1', 'milestones', 'm1'))).toBeUndefined()
    expect(readDoc(path('projects', 'p1', 'journal', 'j1'))).toBeUndefined()
    for (const [col, id] of [['tasks', 't1'], ['tasks', 't4'], ['events', 'e1'], ['transactions', 'x1'], ['workLog', 'w1']]) {
      const d = readDoc(path(col, id))
      expect(d, `${col}/${id}`).toBeDefined()
      expect(d.projectId, `${col}/${id}`).toBeNull()
    }
  })

  it('excluir proposta apaga o histórico dela e não afeta cliente nem projetos', async () => {
    bootApp({ hash: '#/comercial/r1', seed: seedAll })
    const user = userEvent.setup()
    await heading('Redesign de landing page')
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(readDoc(path('proposals', 'r1'))).toBeUndefined())
    expect(readDoc(path('proposals', 'r1', 'history', 'h1'))).toBeUndefined()
    expect(readDoc(path('clients', 'c1'))).toBeDefined()
    expect(allPaths().some((p) => p.includes('/projects/p1'))).toBe(true)
  })

  it('excluir registro de tempo apaga os ajustes dele e o tempo sai do relatório', async () => {
    bootApp({ hash: '#/tempo', seed: () => { seedAll(); seedDoc(path('timeEntries', 'te1', 'revisions', 'rv1'), { before: { description: 'x', durationSeconds: 60 }, at: now }) } })
    const user = userEvent.setup()
    await heading('Tempo')
    await user.click((await screen.findAllByRole('button', { name: 'Edição' }))[0])
    await user.click(await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Excluir' }))
    await user.click(within((await screen.findAllByRole('dialog')).at(-1)).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(readDoc(path('timeEntries', 'te1'))).toBeUndefined())
    expect(readDoc(path('timeEntries', 'te1', 'revisions', 'rv1'))).toBeUndefined()
    expect(await screen.findByText('Sem registros neste período')).toBeTruthy()
  })

  it('dados históricos: itens excluídos aparecem como "(excluída)" em vez de quebrar', async () => {
    bootApp({ hash: '#/tempo', seed: () => seedDoc(path('timeEntries', 'th'), { description: 'Trabalho antigo', taskId: 'tarefa-que-nao-existe', projectId: 'projeto-que-nao-existe', start: day(0, 7, 0), end: day(0, 8, 0), durationSeconds: 3600, billable: false, source: 'manual', revisionCount: 0, createdAt: now, updatedAt: now }) })
    await heading('Tempo')
    expect((await screen.findAllByText(/\(tarefa excluída\)/)).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Por projeto' }))
    expect((await screen.findAllByText(/\(projeto excluído\)/)).length).toBeGreaterThan(0)
  })

  it('cliente arquivado: projetos dele continuam legíveis com "(arquivado)"', async () => {
    bootApp({ hash: '#/projetos', seed: () => { seedWorkspace(); seedDoc(path('clients', 'c1'), { name: 'Ana Souza', company: '', email: '', phone: '', source: '', status: 'archived', notes: '', nextAction: '', nextActionDate: null, createdAt: now, updatedAt: now }) } })
    expect((await screen.findAllByText(/Ana Souza \(arquivado\)/)).length).toBeGreaterThan(0)
  })
})

describe('modelos de projeto: só cria o que foi confirmado', () => {
  async function openWizard(user) {
    await user.click((await screen.findAllByRole('button', { name: 'Usar modelo' }))[0]) // "Meu modelo" fica depois dos padrão; o primeiro é um padrão
    return topDialog()
  }

  it('cancelar não cria nada', async () => {
    bootApp({ hash: '#/modelos', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Modelos de projeto')
    const before = [listDocs(path('projects')).length, listDocs(path('tasks')).length]
    const d = await openWizard(user)
    expect(d.getByText(/Nada é criado até você confirmar/)).toBeTruthy()
    await user.click(d.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect([listDocs(path('projects')).length, listDocs(path('tasks')).length]).toEqual(before)
  })

  it('confirmar cria 1 projeto + só as tarefas marcadas, vinculadas, de uma vez; duplo clique não duplica', async () => {
    bootApp({ hash: '#/modelos', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Modelos de projeto')
    const tasksBefore = listDocs(path('tasks')).length
    const projectsBefore = listDocs(path('projects')).length
    const d = await openWizard(user) // 1º modelo padrão: Site institucional (8 tarefas)
    await user.click(d.getByLabelText('Treinamento e entrega ao cliente')) // desmarca uma
    const createBtn = d.getByRole('button', { name: /Criar projeto e 7 tarefas/ })
    await user.dblClick(createBtn)
    await waitFor(() => expect(listDocs(path('projects')).length).toBe(projectsBefore + 1))
    const project = listDocs(path('projects')).find((p) => p.name === 'Site institucional')
    const created = listDocs(path('tasks')).filter((t) => t.projectId === project.id)
    expect(created.length).toBe(7)
    expect(listDocs(path('tasks')).length).toBe(tasksBefore + 7)
    expect(created.some((t) => t.title === 'Treinamento e entrega ao cliente')).toBe(false)
    expect(created.every((t) => t.status === 'todo' && t.due)).toBe(true) // início = hoje → todas com prazo
    expect(project.status).toBe('planning')
    await waitFor(() => expect(window.location.hash).toBe(`#/projetos/${project.id}`))
  })

  it('falha ao gravar: nada é criado (tudo ou nada) e dá para tentar de novo sem duplicar', async () => {
    bootApp({ hash: '#/modelos', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Modelos de projeto')
    const counts = () => [listDocs(path('projects')).length, listDocs(path('tasks')).length]
    const before = counts()
    const d = await openWizard(user)
    failAll('unavailable', ['write'])
    await user.click(d.getByRole('button', { name: /Criar projeto e 8 tarefas/ }))
    expect(await d.findByText(/Nada foi criado/)).toBeTruthy()
    expect(counts()).toEqual(before)
    clearFailure()
    await user.click(d.getByRole('button', { name: /Criar projeto e 8 tarefas/ }))
    await waitFor(() => expect(counts()).toEqual([before[0] + 1, before[1] + 8]))
  })
})

describe('cronômetro', () => {
  const timerDoc = (msAgo, extra = {}) => ({ start: Timestamp.fromMillis(Date.now() - msAgo), description: 'Trabalho', taskId: null, projectId: null, billable: false, ...extra })

  it('iniciar cria UM cronômetro; não é possível iniciar outro (UI e serviço)', async () => {
    bootApp({ hash: '#/tempo', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Tempo')
    await user.click(await screen.findByRole('button', { name: 'Iniciar cronômetro' }))
    expect(await screen.findByText('Cronômetro ativo')).toBeTruthy()
    expect(readDoc(path('timer', 'current'))).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Iniciar cronômetro' })).toBeNull() // some da tela
    await expect(startTimer('u1', {})).rejects.toMatchObject({ code: 'timer-active' }) // outra aba/aparelho
    expect(listDocs(path('timer')).length).toBe(1)
  })

  it('recarregar a página: o cronômetro continua e o tempo vem do início real', async () => {
    const first = bootApp({ hash: '#/tempo', seed: () => { seedWorkspace(); seedDoc(path('timer', 'current'), timerDoc(2 * 3600 * 1000)) } })
    await heading('Tempo')
    expect((await screen.findAllByText(/^02:00:\d\d$/)).length).toBeGreaterThan(0)
    first.unmount() // "recarrega": o app some e é montado de novo; sessão e dados (servidor) continuam
    expect(screen.queryByText(/^02:00:\d\d$/)).toBeNull()
    mountApp('#/tempo')
    await heading('Tempo')
    expect((await screen.findAllByText(/^02:00:\d\d$/)).length).toBeGreaterThan(0)
    expect(listDocs(path('timer')).length).toBe(1)
  })

  it('parar registra o tempo decorrido e apaga o cronômetro', async () => {
    bootApp({ hash: '#/tempo', seed: () => { seedWorkspace(); seedDoc(path('timer', 'current'), timerDoc(3600 * 1000, { taskId: 't2', projectId: 'p2' })) } })
    const user = userEvent.setup()
    await heading('Tempo')
    await user.click(await screen.findByRole('button', { name: 'Parar e registrar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(readDoc(path('timer', 'current'))).toBeUndefined())
    const entry = listDocs(path('timeEntries')).find((e) => e.source === 'timer')
    expect(entry.durationSeconds).toBeGreaterThanOrEqual(3600)
    expect(entry.durationSeconds).toBeLessThan(3610)
    expect(entry.taskId).toBe('t2')
  })

  it('cronômetro esquecido (> 24 h): avisa e NÃO registra sem corrigir o fim', async () => {
    bootApp({ hash: '#/tempo', seed: () => { seedWorkspace(); seedDoc(path('timer', 'current'), timerDoc(30 * 3600 * 1000)) } })
    const user = userEvent.setup()
    await heading('Tempo')
    expect(await screen.findByText(/ativo há mais de 8 horas/)).toBeTruthy()
    await user.click(await screen.findByRole('button', { name: 'Parar e registrar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByText(/mais de 24 horas/)).toBeTruthy()
    expect(readDoc(path('timer', 'current'))).toBeDefined()
    expect(listDocs(path('timeEntries')).filter((e) => e.source === 'timer').length).toBe(0)
  })

  it('descartar pede confirmação e não registra nada', async () => {
    bootApp({ hash: '#/tempo', seed: () => { seedWorkspace(); seedDoc(path('timer', 'current'), timerDoc(600 * 1000)) } })
    const user = userEvent.setup()
    await heading('Tempo')
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))
    expect(await screen.findByText(/não será registrado/)).toBeTruthy()
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(readDoc(path('timer', 'current'))).toBeUndefined())
    expect(listDocs(path('timeEntries')).filter((e) => e.source === 'timer').length).toBe(0)
  })

  it('registro manual: fim antes do início, mais de 24 h e fim no futuro são rejeitados; sobreposição só avisa', async () => {
    bootApp({ hash: '#/tempo', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Tempo')
    await user.click(await screen.findByRole('button', { name: 'Registro manual' }))
    const d = await topDialog()
    const set = (label, v) => fireEvent.change(d.getByLabelText(label), { target: { value: v } })
    const base = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); x.setHours(8, 0, 0, 0); const p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}` }
    set('Início', base(0)); set('Fim', base(0)) // fim = início
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('O fim deve ser depois do início.')).toBeTruthy()
    set('Início', base(-3)); set('Fim', base(0)) // 3 dias
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText(/no máximo 24 horas/)).toBeTruthy()
    set('Início', base(0)); set('Fim', base(2)) // futuro
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText(/não pode estar no futuro|no máximo 24 horas/)).toBeTruthy()
    expect(listDocs(path('timeEntries')).length).toBe(1) // só o semeado
    // sobreposição ao registro semeado (08:00–09:30 de hoje): só avisa
    set('Início', base(0)); set('Fim', base(0).replace('T08:00', 'T08:45'))
    expect(await d.findByText(/se sobrepõe a 1 outro registro/)).toBeTruthy()
  })
})
