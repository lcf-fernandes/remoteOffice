import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp, seedDoc } from './fake-firebase/store.js'
import { bootApp, day, path } from './helpers.jsx'

const now = Timestamp.now()
const seedTasks = (n) => { for (let i = 1; i <= n; i++) seedDoc(path('tasks', `t${String(i).padStart(3, '0')}`), { title: `Tarefa ${String(i).padStart(3, '0')}`, description: '', status: 'todo', priority: 'low', due: day(i), category: '', tags: [], clientId: null, projectId: null, completedAt: null, createdAt: now, updatedAt: now }) }
const rows = () => document.querySelectorAll('.task-list > li').length

describe('listas longas: carregamento incremental', () => {
  it('mostra 50, libera mais sob demanda e some o botão ao chegar ao fim', async () => {
    bootApp({ hash: '#/tarefas', seed: () => seedTasks(120) })
    const user = userEvent.setup()
    expect(await screen.findByText('Mostrando 50 de 120 tarefas')).toBeTruthy()
    expect(rows()).toBe(50)
    await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
    expect(await screen.findByText('Mostrando 100 de 120 tarefas')).toBeTruthy()
    expect(rows()).toBe(100)
    await user.click(screen.getByRole('button', { name: 'Mostrar mais 20' }))
    expect(await screen.findByText('Mostrando 120 de 120 tarefas')).toBeTruthy()
    expect(rows()).toBe(120)
    expect(screen.queryByRole('button', { name: /Mostrar mais/ })).toBeNull()
  })

  it('lista curta não mostra rodapé nem botão', async () => {
    bootApp({ hash: '#/tarefas', seed: () => seedTasks(8) })
    await screen.findAllByText('Tarefa 001')
    expect(rows()).toBe(8)
    expect(screen.queryByText(/Mostrando/)).toBeNull()
  })

  it('a busca procura em TODAS as tarefas (não só nas 50 visíveis) e volta ao início da lista', async () => {
    bootApp({ hash: '#/tarefas', seed: () => seedTasks(120) })
    const user = userEvent.setup()
    await screen.findByText('Mostrando 50 de 120 tarefas')
    expect(screen.queryByText('Tarefa 118')).toBeNull() // fora da primeira página
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Tarefa 118' } })
    expect(await screen.findByText('Tarefa 118')).toBeTruthy() // encontrada mesmo estando na posição 118
    expect(rows()).toBe(1)
    expect(screen.queryByText(/Mostrando/)).toBeNull()
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: '' } })
    expect(await screen.findByText('Mostrando 50 de 120 tarefas')).toBeTruthy() // limpar a busca volta à 1ª página
    await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
    expect(rows()).toBe(100)
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Tarefa 1' } }) // mudar o filtro reinicia a página
    await waitFor(() => expect(rows()).toBeLessThanOrEqual(50))
  })

  it('concluir uma tarefa pelo botão funciona em itens além da primeira página', async () => {
    bootApp({ hash: '#/tarefas', seed: () => seedTasks(60) })
    const user = userEvent.setup()
    await screen.findByText('Mostrando 50 de 60 tarefas')
    await user.click(screen.getByRole('button', { name: 'Mostrar mais 10' }))
    await user.click(await screen.findByRole('button', { name: 'Concluir: Tarefa 060' }))
    await waitFor(() => expect(screen.queryByText('Tarefa 060')).toBeNull()) // some da visão "Abertas"
  })

  it('financeiro: a lista é cortada, mas os totais continuam somando TODOS os lançamentos', async () => {
    bootApp({ hash: '#/financeiro', seed: () => { for (let i = 0; i < 120; i++) seedDoc(path('transactions', `x${i}`), { description: `Recebimento ${i}`, type: 'income', amount: 10, currency: 'BRL', status: 'paid', dueDate: day(0), paidDate: day(0), category: '', clientId: null, projectId: null, notes: '', createdAt: now, updatedAt: now }) } })
    expect(await screen.findByText('Mostrando 50 de 120 lançamentos')).toBeTruthy()
    const table = within(await screen.findByRole('table', { name: /Totais em BRL/ }))
    expect(table.getAllByText(/R\$\s*1\.200,00/).length).toBeGreaterThan(0) // 120 × 10, não 50 × 10
    expect(screen.getByText(/Saldo realizado/).textContent).toMatch(/1\.200,00/)
  })

  it('tempo: a lista é cortada, mas o relatório soma todos os registros', async () => {
    bootApp({ hash: '#/tempo', seed: () => { for (let i = 0; i < 80; i++) seedDoc(path('timeEntries', `e${i}`), { description: `Registro ${i}`, taskId: null, projectId: null, start: day(0, 6, 0), end: day(0, 7, 0), durationSeconds: 3600, billable: false, source: 'manual', revisionCount: 0, createdAt: now, updatedAt: now }) } })
    expect(await screen.findByText('Mostrando 50 de 80 registros')).toBeTruthy()
    expect((await screen.findAllByText('80h 00min')).length).toBeGreaterThan(0) // total do período = 80 registros × 1 h
  })
})
