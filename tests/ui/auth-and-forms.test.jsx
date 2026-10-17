import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeAuth } from './fake-firebase/auth.js'
import { listDocs, readDoc } from './fake-firebase/store.js'
import { bootApp, path, seedWorkspace, UID } from './helpers.jsx'

const heading = (name) => screen.findByRole('heading', { level: 1, name }, { timeout: 8000 })
const dialog = async () => within(await screen.findByRole('dialog'))

describe('login, logout e sessão', () => {
  it('sem sessão: mostra o login e nenhum dado', async () => {
    bootApp({ signedIn: false, seed: seedWorkspace })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByText('Corrigir menu responsivo')).toBeNull()
    expect(screen.queryByText('Ana Souza')).toBeNull()
  })

  it('senha errada: mensagem compreensível, continua deslogado', async () => {
    bootApp({ signedIn: false })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('E-mail'), 'leandro@teste.com')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: /Bom dia|Boa tarde|Boa noite/ })).toBeNull()
  })

  it('campos vazios: pede e-mail e senha sem chamar o servidor', async () => {
    bootApp({ signedIn: false })
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe e-mail e senha.')).toBeTruthy()
  })

  it('login válido entra no app e logout volta ao login', async () => {
    bootApp({ signedIn: false, seed: seedWorkspace })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('E-mail'), 'leandro@teste.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-correta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await heading(/Bom dia|Boa tarde|Boa noite/)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByText('Corrigir menu responsivo')).toBeNull()
  })

  it('sessão expirada com o app aberto: volta ao login e some com os dados da tela', async () => {
    bootApp({ hash: '#/tarefas', seed: seedWorkspace })
    expect((await screen.findAllByText('Corrigir menu responsivo')).length).toBeGreaterThan(0)
    act(() => fakeAuth.expireSession())
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByText('Corrigir menu responsivo')).toBeNull()
  })

  it('recuperar senha sem e-mail pede o e-mail; com e-mail desconhecido a resposta é neutra', async () => {
    bootApp({ signedIn: false })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Esqueci a senha' }))
    expect(await screen.findByText(/Digite seu e-mail/)).toBeTruthy()
    await user.type(screen.getByLabelText('E-mail'), 'ninguem@teste.com')
    await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
    expect(await screen.findByText(/Se este e-mail tiver uma conta/)).toBeTruthy() // não revela se existe
  })
})

describe('isolamento entre usuários (caminhos do app)', () => {
  it('outro usuário não vê nenhum dado do primeiro em nenhuma tela', async () => {
    bootApp({ hash: '#/tarefas', uid: 'u2', email: 'outra@teste.com', seed: () => seedWorkspace(UID) }) // dados são do u1; quem entra é o u2
    await heading('Tarefas')
    expect(await screen.findByText('Nenhuma tarefa ainda')).toBeTruthy()
    expect(screen.queryByText('Corrigir menu responsivo')).toBeNull()
    // e nada foi gravado no espaço do outro usuário
    expect(listDocs('users/u1/tasks').length).toBe(4)
  })

  it('o app nunca grava fora de users/{uid}', async () => {
    bootApp({ hash: '#/tarefas', uid: 'u2', email: 'outra@teste.com' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    await user.type(await screen.findByLabelText('Título'), 'Minha tarefa')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(listDocs('users/u2/tasks').length).toBe(1))
    expect(listDocs('users/u1/tasks').length).toBe(0)
  })
})

describe('formulários inválidos, vazios e valores extremos', () => {
  it('tarefa: título vazio e título gigante são rejeitados; válida é gravada', async () => {
    bootApp({ hash: '#/tarefas' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    let d = await dialog()
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('Informe um título.')).toBeTruthy()
    fireEvent.change(d.getByLabelText('Título'), { target: { value: 'x'.repeat(201) } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText(/no máximo 200 caracteres/)).toBeTruthy()
    expect(listDocs(path('tasks')).length).toBe(0)
    fireEvent.change(d.getByLabelText('Título'), { target: { value: 'Tarefa válida' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(listDocs(path('tasks')).map((t) => t.title)).toEqual(['Tarefa válida']))
  })

  it('cliente: e-mail e telefone inválidos', async () => {
    bootApp({ hash: '#/clientes' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Novo cliente' }))
    const d = await dialog()
    await user.type(d.getByLabelText('Nome'), 'Fulano')
    await user.type(d.getByLabelText('E-mail (opcional)'), 'isto-nao-e-email')
    await user.type(d.getByLabelText('Telefone (opcional)'), 'abc')
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('Digite um e-mail válido.')).toBeTruthy()
    expect(d.getByText(/Telefone inválido/)).toBeTruthy()
    expect(listDocs(path('clients')).length).toBe(0)
  })

  it('valores monetários: negativo, vazio, texto e enormes são rejeitados; centavos são arredondados', async () => {
    bootApp({ hash: '#/clientes/c1', seed: seedWorkspace })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova proposta' }))
    const d = await dialog()
    await user.type(d.getByLabelText('Título'), 'Proposta teste')
    const amount = d.getByLabelText('Valor estimado')
    for (const bad of ['', '-5', '1e13']) {
      fireEvent.change(amount, { target: { value: bad } })
      await user.click(d.getByRole('button', { name: 'Salvar' }))
      expect(await d.findByText(/Informe o valor estimado|não pode ser negativo|Valor alto demais/)).toBeTruthy()
    }
    expect(listDocs(path('proposals')).filter((p) => p.title === 'Proposta teste').length).toBe(0)
    fireEvent.change(amount, { target: { value: '1234.567' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(listDocs(path('proposals')).find((p) => p.title === 'Proposta teste')?.amount).toBe(1234.57))
  })

  it('lançamento: valor zero é rejeitado; vencimento obrigatório', async () => {
    bootApp({ hash: '#/financeiro' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova receita' }))
    const d = await dialog()
    await user.type(d.getByLabelText('Descrição'), 'Teste')
    fireEvent.change(d.getByLabelText('Valor'), { target: { value: '0' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('O valor deve ser maior que zero.')).toBeTruthy()
    expect(d.getByText('Informe o vencimento.')).toBeTruthy()
    expect(listDocs(path('transactions')).length).toBe(0)
  })

  it('evento: fim antes do início é rejeitado', async () => {
    bootApp({ hash: '#/agenda' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Novo evento' }))
    const d = await dialog()
    await user.type(d.getByLabelText('Título'), 'Reunião')
    fireEvent.change(d.getByLabelText('Início'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(d.getByLabelText('Fim (opcional)'), { target: { value: '2026-10-10T09:00' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('O fim não pode ser antes do início.')).toBeTruthy()
    expect(listDocs(path('events')).length).toBe(0)
  })

  it('nota: conteúdo vazio é rejeitado e texto com HTML não vira HTML', async () => {
    bootApp({ hash: '#/notas' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova nota' }))
    let d = await dialog()
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await d.findByText('Escreva o conteúdo da nota.')).toBeTruthy()
    fireEvent.change(d.getByLabelText('Título (opcional)'), { target: { value: '<img src=x onerror=alert(1)>' } })
    fireEvent.change(d.getByLabelText('Conteúdo'), { target: { value: '<script>window.__pwned = true</script>' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeTruthy() // exibido como texto
    expect(document.querySelector('img[src="x"]')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('link de projeto/atalho com esquema perigoso é rejeitado', async () => {
    bootApp({ hash: '#/configuracoes' })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nome'), 'Malicioso')
    await user.type(screen.getByLabelText('Endereço (https://…)'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Adicionar atalho' }))
    expect(await screen.findByText(/começando com http/)).toBeTruthy()
    expect(readDoc('users/u1').preferences.externalLinks).toBeUndefined()
  })
})
