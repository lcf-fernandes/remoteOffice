import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { allowConsoleProblems } from './setup.js'
import { bootApp, seedWorkspace } from './helpers.jsx'

// Cada tela precisa renderizar com dados reais (não só o título), sem exceções nem avisos do React.
const ROUTES = [
  ['dashboard', '#/dashboard', /Bom dia|Boa tarde|Boa noite/, ['Linha do dia', 'Corrigir menu responsivo', /Tarefa atrasada/]],
  ['tarefas', '#/tarefas', 'Tarefas', ['Corrigir menu responsivo', 'Revisar legendas', 'Tarefa solta sem prazo']],
  ['clientes', '#/clientes', 'Clientes', ['Ana Souza']],
  ['detalhe do cliente', '#/clientes/c1', 'Ana Souza', ['Alinhamento do escopo', 'Site da agência', 'Redesign de landing page', 'Ideia']],
  ['projetos', '#/projetos', 'Projetos', ['Site da agência', 'Vídeo institucional']],
  ['detalhe do projeto', '#/projetos/p1', 'Site da agência', ['Layout aprovado', 'Reunião de kickoff', 'Corrigir menu responsivo', 'github.com', 'Montei o layout']],
  ['modelos', '#/modelos', 'Modelos de projeto', ['Meu modelo', 'Site institucional', 'Vídeo institucional']],
  ['agenda', '#/agenda', 'Agenda', ['Reunião de alinhamento']],
  ['comercial', '#/comercial', 'Comercial', ['Redesign de landing page']],
  ['detalhe da proposta', '#/comercial/r1', 'Redesign de landing page', ['Proposta criada como Enviada']],
  ['financeiro', '#/financeiro', 'Financeiro', []],
  ['tempo', '#/tempo', 'Tempo', ['Edição']],
  ['notas', '#/notas', 'Notas', ['Ideia']],
  ['configurações', '#/configuracoes', 'Configurações', ['Atalhos externos', 'Alertas internos']],
  ['rota desconhecida', '#/nao-existe', 'Página não encontrada', []],
]

describe('todas as telas renderizam com dados reais', () => {
  for (const [name, hash, heading, contents] of ROUTES) {
    it(name, async () => {
      bootApp({ hash, seed: seedWorkspace })
      expect(await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 8000 })).toBeTruthy()
      for (const text of contents) expect((await screen.findAllByText(text, { exact: false }, { timeout: 8000 })).length).toBeGreaterThan(0)
      await waitFor(() => expect(screen.queryByText(/Carregando/)).toBeNull(), { timeout: 8000 })
    })
  }

  it('financeiro mostra lançamentos (período "Tudo") e totais separados por moeda', async () => {
    bootApp({ hash: '#/financeiro', seed: seedWorkspace })
    fireEvent.click(await screen.findByRole('button', { name: 'Tudo' }))
    expect((await screen.findAllByText('Parcela 2/3')).length).toBeGreaterThan(0)
    expect(screen.getByText('Totais em BRL')).toBeTruthy()
    expect(screen.getByText('Totais em USD')).toBeTruthy() // moedas nunca somadas
  })
})

describe('a rede de segurança do teste funciona', () => {
  it('um console.error durante o render é detectado', () => {
    allowConsoleProblems()
    console.error('boom')
    expect(console.error).toHaveBeenCalled() // sem allowConsoleProblems(), este teste falharia no afterEach
  })
})
