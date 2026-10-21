import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { fakeAuth } from './fake-firebase/auth.js'
import { resetStore } from './fake-firebase/store.js'

// ---- o jsdom não traz estas APIs de navegador usadas pelo app ----
if (!window.matchMedia) {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })
}
if (typeof HTMLDialogElement !== 'undefined') {
  // Imita a especificação do HTML: showModal() lembra o elemento focado; close() devolve o foco a ele (o jsdom não faz isso).
  const previous = new WeakMap()
  HTMLDialogElement.prototype.showModal = function showModal() { previous.set(this, document.activeElement); this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    const back = previous.get(this)
    if (back && back.isConnected && typeof back.focus === 'function') back.focus()
    this.dispatchEvent(new Event('close'))
  }
}

// Elementos dentro de um <dialog> fechado não são renderizados e, no navegador, não recebem foco (o jsdom deixa).
const nativeFocus = HTMLElement.prototype.focus
HTMLElement.prototype.focus = function focus(...args) { if (this.closest && this.closest('dialog:not([open])')) return; return nativeFocus.apply(this, args) }

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
