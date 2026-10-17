import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { fakeAuth } from './fake-firebase/auth.js'
import { resetStore } from './fake-firebase/store.js'

// ---- o jsdom não traz estas APIs de navegador usadas pelo app ----
if (!window.matchMedia) {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })
}
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function close() { if (this.hasAttribute('open')) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) } }
}

// Qualquer console.error/warn (ex.: avisos do React, chaves repetidas, exceções) FALHA o teste, salvo quando o teste declara o contrário.
let consoleProblems = []
let allowed = false
export const allowConsoleProblems = () => { allowed = true }

beforeEach(() => {
  consoleProblems = []; allowed = false
  vi.spyOn(console, 'error').mockImplementation((...a) => { consoleProblems.push(a.map((x) => (x instanceof Error ? x.stack : String(x))).join(' ')) })
  vi.spyOn(console, 'warn').mockImplementation((...a) => { consoleProblems.push(`[warn] ${a.map(String).join(' ')}`) })
  resetStore(); fakeAuth.reset(); window.localStorage.clear(); window.location.hash = ''
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (!allowed) expect(consoleProblems, 'console.error/warn durante o teste').toEqual([])
})
