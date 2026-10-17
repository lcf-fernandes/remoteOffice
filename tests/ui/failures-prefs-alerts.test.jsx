import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp, breakListeners, clearFailure, failAll, listDocs, readDoc, seedDoc } from './fake-firebase/store.js'
import { bootApp, day, mountApp, path, seedProfile, seedWorkspace } from './helpers.jsx'

const heading = (name) => screen.findByRole('heading', { level: 1, name }, { timeout: 8000 })
const now = Timestamp.now()

describe('falha de rede e recarregamento', () => {
  it('falha ao carregar: erro compreensível com "Tentar de novo"; ao voltar a rede, os dados aparecem', async () => {
    bootApp({ hash: '#/tarefas', seed: seedWorkspace })
    await heading('Tarefas')
    expect((await screen.findAllByText('Corrigir menu responsivo')).length).toBeGreaterThan(0)
    act(() => breakListeners('unavailable'))
    expect(await screen.findByText('Não foi possível carregar as tarefas')).toBeTruthy()
    expect(screen.getByText(/Sem conexão com o servidor/)).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect((await screen.findAllByText('Corrigir menu responsivo')).length).toBeGreaterThan(0)
  })

  it('regras não publicadas (permission-denied): a mensagem explica o que conferir', async () => {
    bootApp({ hash: '#/clientes', seed: seedWorkspace })
    await heading('Clientes')
    act(() => breakListeners('permission-denied'))
    expect(await screen.findByText(/regras do Firestore foram publicadas/)).toBeTruthy()
  })

  it('falha ao salvar: o erro aparece, o texto digitado fica, e salvar de novo grava UMA vez', async () => {
    bootApp({ hash: '#/tarefas' })
    const user = userEvent.setup()
    await heading('Tarefas')
    await user.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    const d = within(await screen.findByRole('dialog'))
    await user.type(d.getByLabelText('Título'), 'Tarefa durante a queda')
    failAll('unavailable', ['write'])
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText(/Sem conexão com o servidor/)).toBeTruthy()
    expect(d.getByLabelText('Título').value).toBe('Tarefa durante a queda') // nada se perdeu
    expect(listDocs(path('tasks')).length).toBe(0)
    clearFailure()
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(listDocs(path('tasks')).length).toBe(1))
  })

  it('falha ao carregar a conta no login: mensagem em português (não um código técnico)', async () => {
    bootApp({ hash: '#/dashboard', fail: ['unavailable', ['read']] })
    expect(await screen.findByText('Não foi possível carregar sua conta')).toBeTruthy()
    expect(screen.getByText(/Sem conexão com o servidor/)).toBeTruthy() // causa real, não uma mensagem genérica
    expect(screen.queryByText(/unavailable|FirebaseError/)).toBeNull()
  })

  it('conta que não carrega por regras não publicadas (permission-denied): explica o que conferir', async () => {
    bootApp({ hash: '#/dashboard', fail: ['permission-denied', ['read']] })
    expect(await screen.findByText('Não foi possível carregar sua conta')).toBeTruthy()
    expect(screen.getByText(/regras do Firestore foram publicadas/)).toBeTruthy()
  })

  it('salvar uma tarefa que foi excluída em outro aparelho: mensagem clara, sem travar', async () => {
    bootApp({ hash: '#/tarefas', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading('Tarefas')
    await user.click(await screen.findByRole('button', { name: /^Corrigir menu responsivo/ }))
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const d = within((await screen.findAllByRole('dialog')).at(-1))
    act(() => { /* outro aparelho exclui */ })
    const { deleteDoc, doc } = await import('./fake-firebase/store.js')
    await deleteDoc(doc(null, path('tasks', 't1')))
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText(/não existe mais/)).toBeTruthy()
  })
})

describe('documentos ausentes e links diretos', () => {
  for (const [hash, text] of [['#/clientes/nao-existe', 'Cliente não encontrado'], ['#/projetos/nao-existe', 'Projeto não encontrado'], ['#/comercial/nao-existe', 'Proposta não encontrada']]) {
    it(`${hash} mostra "${text}" sem quebrar`, async () => {
      bootApp({ hash, seed: seedWorkspace })
      expect(await screen.findByText(text, {}, { timeout: 8000 })).toBeTruthy()
    })
  }

  it('alerta de tarefa abre a tarefa certa e limpa o endereço', async () => {
    bootApp({ hash: '#/tarefas/t1', seed: seedWorkspace })
    const d = within(await screen.findByRole('dialog', {}, { timeout: 8000 }))
    expect(d.getByText('Corrigir menu responsivo')).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/tarefas'))
  })

  it('link direto de tarefa inexistente avisa em vez de falhar', async () => {
    bootApp({ hash: '#/tarefas/x-nao-existe', seed: seedWorkspace })
    expect(await screen.findByText('Tarefa não encontrada', {}, { timeout: 8000 })).toBeTruthy()
  })

  it('alerta de lançamento abre o lançamento certo', async () => {
    bootApp({ hash: '#/financeiro/x1', seed: seedWorkspace })
    const d = within(await screen.findByRole('dialog', {}, { timeout: 8000 }))
    expect(d.getByDisplayValue('Parcela 2/3')).toBeTruthy()
  })
})

describe('alertas e indicadores', () => {
  it('lista motivo, ação e link de cada condição, sem repetir ao recarregar; resolver faz sumir', async () => {
    const first = bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    const countAlerts = () => document.querySelectorAll('.alert').length
    await screen.findByText(/alertas?( ·|$)/, {}, { timeout: 8000 })
    for (const label of ['Tarefa atrasada:', 'Lançamento vencido:', 'Proposta pede retorno:', 'Projeto com prazo próximo:', 'Projeto aguardando cliente:']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    const links = [...document.querySelectorAll('.alert a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining(['#/tarefas/t1', '#/financeiro/x1', '#/comercial/r1', '#/projetos/p1', '#/projetos/p3']))
    const n = countAlerts()
    first.unmount(); mountApp('#/dashboard'); await screen.findByText(/alertas?( ·|$)/)
    expect(countAlerts()).toBe(n) // recarregar não multiplica
    // resolver a condição: concluir a tarefa atrasada
    act(() => seedDoc(path('tasks', 't1'), { ...readDoc(path('tasks', 't1')), status: 'done' }))
    await waitFor(() => expect(screen.queryByText('Tarefa atrasada:')).toBeNull())
    expect(countAlerts()).toBe(n - 1)
  })

  it('conta vazia: mostra o guia "Comece por aqui" e nenhum número enganoso', async () => {
    bootApp({ hash: '#/dashboard' })
    expect(await screen.findByText('Comece por aqui', {}, { timeout: 8000 })).toBeTruthy()
    expect(screen.queryByText('Tarefas abertas')).toBeNull()
  })

  it('com fontes indisponíveis: avisa que os alertas podem estar incompletos (não diz "tudo em dia")', async () => {
    bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    await screen.findByText(/alertas?( ·|$)/, {}, { timeout: 8000 })
    act(() => breakListeners('unavailable'))
    expect(await screen.findByText(/Os alertas abaixo podem estar incompletos/)).toBeTruthy()
    expect(screen.queryByText(/Nenhum alerta no momento/)).toBeNull()
  })

  it('contextos mudam a apresentação sem criar registros', async () => {
    bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    const user = userEvent.setup()
    const before = JSON.stringify([listDocs(path('tasks')), listDocs(path('projects'))])
    await user.click(await screen.findByRole('button', { name: 'Edição' }))
    expect((await screen.findAllByText('Fila de vídeos')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Desenvolvimento' }))
    expect((await screen.findAllByText('Projetos técnicos')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/github\.com/).length).toBeGreaterThan(0)
    expect(JSON.stringify([listDocs(path('tasks')), listDocs(path('projects'))])).toBe(before)
    expect(readDoc('users/u1').preferences.context).toBe('development') // salvo na conta
  })
})

describe('preferências', () => {
  it('tema escuro: aplica no documento e salva na conta', async () => {
    bootApp({ hash: '#/configuracoes', seed: seedWorkspace })
    fireEvent.change(await screen.findByLabelText('Tema'), { target: { value: 'dark' } })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(readDoc('users/u1').preferences.theme).toBe('dark')
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'light' } })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })

  it('formato de data ISO muda as datas exibidas', async () => {
    bootApp({ hash: '#/configuracoes', seed: seedWorkspace })
    fireEvent.change(await screen.findByLabelText('Formato de data'), { target: { value: 'iso' } })
    await waitFor(() => expect(readDoc('users/u1').preferences.dateStyle).toBe('iso'))
    window.location.hash = '#/tarefas'
    expect((await screen.findAllByText(/prazo \d{4}-\d{2}-\d{2}/, {}, { timeout: 8000 })).length).toBeGreaterThan(0)
  })

  it('início da semana na segunda-feira reordena o calendário', async () => {
    bootApp({ hash: '#/agenda', seed: () => { seedWorkspace(); seedProfile('u1', 'leandro@teste.com', { weekStart: 'mon' }) } })
    await heading('Agenda')
    fireEvent.click(await screen.findByRole('button', { name: 'Mês' }))
    const headers = await screen.findAllByRole('columnheader')
    expect(headers[0].textContent).toMatch(/segunda/)
    expect(headers[6].textContent).toMatch(/domingo/)
  })

  it('preferências corrompidas ou desconhecidas: o app abre com os padrões', async () => {
    bootApp({ hash: '#/dashboard', seed: () => { seedWorkspace(); seedProfile('u1', 'leandro@teste.com', { theme: 'neon', context: 'lazer', weekStart: 'qua', currency: 'XYZ', hiddenBlocks: 'não-é-lista', externalLinks: [{ label: 'x', url: 'javascript:alert(1)' }, null, 7] }) } })
    expect(await heading(/Bom dia|Boa tarde|Boa noite/)).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.queryByText('x')).toBeNull() // atalho perigoso descartado
  })

  it('ocultar um bloco do dashboard', async () => {
    bootApp({ hash: '#/configuracoes', seed: seedWorkspace })
    fireEvent.click(await screen.findByLabelText('Linha do dia'))
    await waitFor(() => expect(readDoc('users/u1').preferences.hiddenBlocks).toEqual(['agenda']))
    window.location.hash = '#/dashboard'
    await heading(/Bom dia|Boa tarde|Boa noite/)
    expect(screen.queryByRole('heading', { name: 'Linha do dia' })).toBeNull()
  })

  it('o nome do perfil aparece na saudação; sem nome, a saudação não inventa um', async () => {
    bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    expect(await heading(/, Leandro$/)).toBeTruthy()
    seedDoc('users/u1', { ...readDoc('users/u1'), displayName: '' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).not.toMatch(/Leandro/))
  })
})

describe('valores monetários exibidos', () => {
  it('formata por moeda e não mistura moedas', async () => {
    bootApp({ hash: '#/comercial', seed: seedWorkspace })
    expect((await screen.findAllByText(/R\$\s*4\.200,50/)).length).toBeGreaterThan(0)
    window.location.hash = '#/financeiro'
    fireEvent.click(await screen.findByRole('button', { name: 'Tudo' }))
    expect((await screen.findAllByText(/US\$\s*25,90/)).length).toBeGreaterThan(0)
    expect(screen.getByText('Totais em BRL')).toBeTruthy()
    expect(screen.getByText('Totais em USD')).toBeTruthy()
  })
})
