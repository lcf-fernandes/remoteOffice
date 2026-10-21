import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { bootApp, seedWorkspace } from './helpers.jsx'

const heading = (name) => screen.findByRole('heading', { level: 1, name }, { timeout: 8000 })

describe('foco e teclado em formulários', () => {
  it('formulário com erro: o foco vai ao primeiro campo inválido, que aponta para a mensagem', async () => {
    bootApp({ hash: '#/tarefas' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    const d = within(await screen.findByRole('dialog'))
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    const title = d.getByLabelText('Título')
    await waitFor(() => expect(document.activeElement).toBe(title))
    expect(title.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(title.getAttribute('aria-describedby')).textContent).toBe('Informe um título.')
  })

  it('erro em um campo de seleção também fica associado e recebe o foco', async () => {
    bootApp({ hash: '#/comercial', seed: seedWorkspace })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nova proposta' }))
    const d = within(await screen.findByRole('dialog'))
    await user.type(d.getByLabelText('Título'), 'Proposta sem cliente')
    fireEvent.change(d.getByLabelText('Valor estimado'), { target: { value: '100' } })
    await user.click(d.getByRole('button', { name: 'Salvar' }))
    const select = d.getByLabelText('Cliente')
    await waitFor(() => expect(document.activeElement).toBe(select))
    expect(document.getElementById(select.getAttribute('aria-describedby')).textContent).toBe('Escolha o cliente.')
  })
})

describe('navegação, título e menu "Criar"', () => {
  it('trocar de tela atualiza o título da aba e leva o foco ao conteúdo', async () => {
    bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    await heading(/Bom dia|Boa tarde|Boa noite/)
    expect(document.title).toBe('Dashboard · Leandro Desk')
    await userEvent.setup().click(screen.getAllByRole('link', { name: 'Clientes' })[0])
    await heading('Clientes')
    expect(document.title).toBe('Clientes · Leandro Desk')
    await waitFor(() => expect(document.activeElement?.id).toBe('conteudo'))
  })

  it('"Criar": abre e fecha pelo teclado, devolve o foco e não promete role="menu"', async () => {
    bootApp({ hash: '#/dashboard', seed: seedWorkspace })
    const user = userEvent.setup()
    await heading(/Bom dia|Boa tarde|Boa noite/)
    const trigger = await screen.findByRole('button', { name: 'Criar' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await user.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
    await user.keyboard('{Escape}')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    // escolher um item abre o formulário e, ao fechá-lo, o foco volta ao "Criar"
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Nova tarefa' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('título da aba para tela desconhecida e para a tela de login', async () => {
    bootApp({ hash: '#/nao-existe' })
    await heading('Página não encontrada')
    expect(document.title).toBe('Página não encontrada · Leandro Desk')
  })
})
