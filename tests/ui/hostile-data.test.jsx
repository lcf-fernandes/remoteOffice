import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { Timestamp, seedDoc } from './fake-firebase/store.js'
import { bootApp, path, seedWorkspace } from './helpers.jsx'

const now = Timestamp.now()
// Dados "hostis" gravados direto no banco (por exemplo, por um bug ou edição manual): a tela não pode se tornar um vetor de ataque.
describe('dados hostis já gravados não viram links nem HTML perigosos', () => {
  it('links de projeto: só http/https viram link', async () => {
    bootApp({ hash: '#/projetos/p1', seed: () => { seedWorkspace(); seedDoc(path('projects', 'p1'), { name: 'Site da agência', description: '', clientId: null, type: 'development', status: 'active', priority: 'high', startDate: null, dueDate: null, links: ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'https://seguro.example.com/ok', 42, null], createdAt: now, updatedAt: now }) } })
    await screen.findByRole('heading', { level: 1, name: 'Site da agência' })
    const hrefs = [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href'))
    expect(hrefs.some((h) => /^(javascript|data|vbscript):/i.test(h))).toBe(false)
    expect(hrefs).toContain('https://seguro.example.com/ok')
  })

  it('e-mail de cliente com parâmetros não vira mailto com cabeçalhos injetados', async () => {
    bootApp({ hash: '#/clientes/c1', seed: () => { seedWorkspace(); seedDoc(path('clients', 'c1'), { name: 'Ana Souza', company: '', email: 'ana@zeta.co?bcc=atacante@x.com&subject=oi', phone: '', source: '', status: 'active', notes: '', nextAction: '', nextActionDate: null, createdAt: now, updatedAt: now }) } })
    await screen.findByRole('heading', { level: 1, name: 'Ana Souza' })
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.getByText(/ana@zeta\.co\?bcc=/)).toBeTruthy() // continua visível, só não é link
  })

  it('atalhos externos perigosos gravados na conta são descartados', async () => {
    bootApp({ hash: '#/dashboard', seed: () => { seedWorkspace(); seedDoc('users/u1', { email: 'leandro@teste.com', displayName: 'Leandro', preferences: { externalLinks: [{ label: 'Mau', url: 'javascript:alert(1)' }, { label: 'Bom', url: 'https://github.com' }] }, createdAt: now, updatedAt: now }) } })
    await screen.findByRole('heading', { level: 1, name: /, Leandro$/ })
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
    expect(hrefs.some((h) => /^javascript:/i.test(h))).toBe(false)
    expect(hrefs).toContain('https://github.com')
  })

  it('texto com marcação e script em qualquer campo aparece como texto puro', async () => {
    bootApp({ hash: '#/tarefas', seed: () => { seedWorkspace(); seedDoc(path('tasks', 't3'), { title: '<img src=x onerror="window.__xss=1">', description: '<script>window.__xss=2</script>', status: 'todo', priority: 'low', due: null, category: '<b>negrito</b>', tags: ['<i>x</i>'], clientId: null, projectId: null, completedAt: null, createdAt: now, updatedAt: now }) } })
    expect((await screen.findAllByText(/<img src=x onerror=/)).length).toBeGreaterThan(0)
    expect(document.querySelector('main img, main b, main i, main script')).toBeNull()
    expect(window.__xss).toBeUndefined()
  })
})
