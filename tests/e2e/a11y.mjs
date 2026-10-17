// Verificação de ACESSIBILIDADE (axe-core) no navegador real, em todas as telas, tema claro e escuro, desktop e celular.
// Requer, instalados à parte: puppeteer-core, @sparticuz/chromium e axe-core. Veja tests/e2e/layout.mjs.
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const DIST = process.env.E2E_OUT ?? '/tmp/e2e-dist'
const ROUTES = ['dashboard', 'tarefas', 'clientes', 'clientes/c1', 'projetos', 'projetos/p1', 'modelos', 'agenda', 'comercial', 'comercial/r1', 'financeiro', 'tempo', 'notas', 'configuracoes']
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = createServer((req, res) => {
  const file = join(DIST, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0])
  if (!existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, r))
const base = `http://localhost:${server.address().port}/index.html`
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' })

const found = new Map() // regra+nó → telas
let screens = 0
for (const theme of ['light', 'dark']) {
  for (const vp of [{ width: 1366, height: 768, n: 'desktop' }, { width: 390, height: 844, n: 'celular' }]) {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      await page.setRequestInterception(true)
      page.on('request', (r) => (r.url().startsWith('http://localhost') ? r.continue() : r.abort()))
      await page.setViewport({ width: vp.width, height: vp.height })
      await page.goto(`${base}?theme=${theme}#/${route}`, { waitUntil: 'load' })
      await page.waitForSelector('h1', { timeout: 15000 })
      await page.waitForFunction(() => !document.body.innerText.includes('Carregando'), { timeout: 15000 }).catch(() => {})
      await new Promise((r) => setTimeout(r, 300))
      await page.evaluate(axeSource)
      const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }))
      for (const v of results.violations) for (const n of v.nodes) {
        const key = `${v.id} | ${v.impact} | ${n.target.join(' ').slice(0, 70)} | ${(n.failureSummary || '').split('\n')[1]?.trim().slice(0, 140) ?? ''}`
        if (!found.has(key)) found.set(key, new Set())
        found.get(key).add(`${theme}-${vp.n}:${route}`)
      }
      screens += 1
      await page.close()
    }
  }
}
await browser.close(); server.close()
console.log(`Telas analisadas: ${screens}`)
const byRule = {}
for (const [key, where] of found) { const id = key.split(' | ')[0]; (byRule[id] ??= []).push([key, where]) }
if (!found.size) console.log('Nenhuma violação encontrada.')
for (const [id, list] of Object.entries(byRule)) {
  console.log(`\n## ${id} (${list.length} ocorrências distintas)`)
  for (const [key, where] of list.slice(0, 6)) console.log(`- ${key.split(' | ').slice(1).join(' | ')}\n    em: ${[...where].slice(0, 4).join(', ')}${where.size > 4 ? ` (+${where.size - 4})` : ''}`)
  if (list.length > 6) console.log(`  … e mais ${list.length - 6}`)
}
process.exitCode = found.size ? 1 : 0
