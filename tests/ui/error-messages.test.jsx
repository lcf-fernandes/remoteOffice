import { describe, expect, it } from 'vitest'
import * as account from '../../src/services/auth.js'
import * as clients from '../../src/services/clients.js'
import * as events from '../../src/services/events.js'
import * as notes from '../../src/services/notes.js'
import * as prefs from '../../src/services/preferences.js'
import * as projects from '../../src/services/projects.js'
import * as proposals from '../../src/services/proposals.js'
import * as tasks from '../../src/services/tasks.js'
import * as templates from '../../src/services/templates.js'
import * as time from '../../src/services/time.js'
import * as transactions from '../../src/services/transactions.js'

// Toda mensagem de erro mostrada ao usuário deve ser clara, em português e nunca expor códigos técnicos.
const MAPPERS = {
  'auth.authErrorMessage': account.authErrorMessage, 'auth.accountErrorMessage': account.accountErrorMessage,
  clients: clients.clientErrorMessage, events: events.eventErrorMessage, notes: notes.notesErrorMessage, preferences: prefs.preferencesErrorMessage,
  projects: projects.projectErrorMessage, proposals: proposals.proposalErrorMessage, tasks: tasks.taskErrorMessage,
  templates: templates.templateErrorMessage, time: time.timeErrorMessage, transactions: transactions.transactionErrorMessage,
}
const CODES = ['permission-denied', 'unavailable', 'not-found', 'unauthenticated', 'resource-exhausted', 'deadline-exceeded', 'failed-precondition', 'cancelled', 'aborted', 'already-exists', 'invalid-argument', 'internal', 'unknown', 'data-loss',
  'auth/invalid-credential', 'auth/too-many-requests', 'auth/network-request-failed', 'auth/user-disabled', 'auth/invalid-email', 'timer-active', 'no-timer', 'bad-range', 'too-many', 'has-proposals', 'codigo-que-nunca-vi']
const INPUTS = [...CODES.map((code) => ({ code, message: `Firebase: Error (${code}).` })), undefined, null, {}, new Error('falha qualquer'), 'string solta', 42]
const TECHNICAL = /permission-denied|unavailable|unauthenticated|resource-exhausted|FirebaseError|Firebase:|undefined|null|\[object|auth\/|Error:/

describe('mensagens de erro dos serviços', () => {
  for (const [name, fn] of Object.entries(MAPPERS)) {
    it(`${name}: sempre uma frase clara em português, sem código técnico, para qualquer erro`, () => {
      for (const input of INPUTS) {
        const msg = fn(input)
        expect(typeof msg, `${name}(${JSON.stringify(input)?.slice(0, 40)})`).toBe('string')
        expect(msg.length).toBeGreaterThan(15)
        expect(msg).not.toMatch(TECHNICAL)
        expect(msg).toMatch(/[a-zçãéíóú]{3,} [a-zçãéíóú]{2,}/i) // frase, não um código
      }
    })
  }

  it('erros de rede e de sessão são distinguidos dos genéricos', () => {
    for (const fn of [clients.clientErrorMessage, tasks.taskErrorMessage, proposals.proposalErrorMessage, transactions.transactionErrorMessage, time.timeErrorMessage, projects.projectErrorMessage, events.eventErrorMessage, templates.templateErrorMessage]) {
      expect(fn({ code: 'unavailable' })).toMatch(/conexão/i)
      expect(fn({ code: 'permission-denied' })).toMatch(/permiss/i)
    }
    expect(account.accountErrorMessage({ code: 'unauthenticated' })).toMatch(/sessão/i)
    expect(account.authErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/conexão/i)
  })

  it('nenhuma mensagem pede para "tentar de novo" quando a operação não é repetível com segurança sem avisar o que aconteceu', () => {
    expect(templates.templateErrorMessage({ code: 'unavailable' })).toMatch(/Nada foi criado/)
    expect(templates.templateErrorMessage({ code: 'x' })).toMatch(/Nada foi criado/)
    expect(notes.notesErrorMessage({ code: 'x' })).toMatch(/texto continua na tela/i)
  })
})
