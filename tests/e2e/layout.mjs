// Teste de LAYOUT no navegador real (Chromium headless). Usa o build de teste com Firebase simulado (vite.e2e.config.js).
// Verifica, em várias larguras: rolagem horizontal da página, elementos fora da tela, erros de console e salva capturas.
// Requer, instalados à parte (não fazem parte das dependências do app): puppeteer-core e @sparticuz/chromium.
//   E2E_OUT=/tmp/e2e-dist npx vite build -c vite.e2e.config.js && node tests/e2e/layout.mjs
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const DIST = process.env.E2E_OUT ?? '/tmp/e2e-dist'
const SHOTS = process.env.E2E_SHOTS ?? '/tmp/shots'
mkdirSync(SHOTS, { recursive: true })

const VIEWPORTS = [
  { name: 'celular-360', width: 360, height: 740 }, { name: 'celular-390', width: 390, height: 844 }, { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 }, { name: 'desktop-1366', width: 1366, height: 768 }, { name: 'desktop-1920', width: 1920, height: 1080 },
]
const ROUTES = ['dashboard', 'tarefas', 'clientes', 'clientes/c1', 'projetos', 'projetos/p1', 'modelos', 'agenda', 'comercial', 'comercial/r1', 'financeiro', 'tempo', 'notas', 'configuracoes']
const EXTRA = [ // [nome, query, rota, ação opcional (texto do botão a clicar)]
  ['dashboard-escuro', 'theme=dark', 'dashboard'], ['tarefas-escuro', 'theme=dark', 'tarefas'], ['agenda-escuro', 'theme=dark', 'agenda'], ['configuracoes-escuro', 'theme=dark', 'configuracoes'],
  ['dashboard-desenvolvimento', 'ctx=development', 'dashboard'], ['dashboard-edicao', 'ctx=editing', 'dashboard'], ['dashboard-comercial', 'ctx=commercial', 'dashboard'],
  ['dashboard-vazio', 'empty=1', 'dashboard'],
  // textos enormes sem espaços (nomes, URLs, e-mails…) em cada tela que os exibe
  ...['dashboard', 'tarefas', 'clientes', 'clientes/cl-long', 'projetos', 'projetos/pl-long', 'comercial', 'comercial/rl-long', 'modelos', 'agenda', 'notas', 'tempo'].map((r) => [`longo-${r}`, 'long=1', r]),
  ['longo-financeiro', 'long=1', 'financeiro', 'Tudo'], ['longo-projetos-kanban', 'long=1', 'projetos', 'Kanban'], ['agenda-mes', 'week=mon', 'agenda', 'Mês'], ['projetos-kanban', '', 'projetos', 'Kanban'], ['financeiro-tudo', '', 'financeiro', 'Tudo'],
]

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer((req, res) => {
  const file = join(DIST, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0])
  if (!existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, r))
const base = `http://localhost:${server.address().port}/index.html`

const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' })
const problems = []
let checked = 0

async function check(vp, label, query, route, click) {
  const page = await browser.newPage()
  const logs = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
  await page.setRequestInterception(true)
  page.on('request', (r) => (r.url().startsWith(`http://localhost`) ? r.continue() : r.abort())) // sem fontes/CDN externos
  await page.setViewport({ width: vp.width, height: vp.height })
  await page.goto(`${base}${query ? `?${query}` : ''}#/${route}`, { waitUntil: 'load' })
  await page.waitForSelector('h1', { timeout: 15000 })
  await page.waitForFunction(() => !document.body.innerText.includes('Carregando'), { timeout: 15000 }).catch(() => {})
  if (click) { const [btn] = await page.$$(`xpath/.//button[normalize-space()="${click}"]`); if (btn) await btn.click(); else logs.push(`aviso: botão "${click}" não encontrado`) }
  await new Promise((r) => setTimeout(r, 350))
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`
    const offenders = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) return false
      if (el.classList.contains('skip') || el.closest('.sr-only')) return false // link de pular conteúdo e texto só para leitor de tela ficam fora da tela de propósito
      if (el.closest('.col--left') && !document.querySelector('.col--left.is-open') && vw < 1100) return false // gaveta fechada, fora da tela de propósito
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p)
        if (/(auto|scroll|hidden)/.test(cs.overflowX) && p.getBoundingClientRect().right <= vw + 1 && p.getBoundingClientRect().left >= -1) return false // dentro de um contêiner com rolagem própria
      }
      return true
    }).slice(0, 4).map(describe)
    const smallText = [...document.querySelectorAll('body *')].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11).length
    return { scrollOverflow: document.documentElement.scrollWidth - vw, offenders, smallText, height: document.documentElement.scrollHeight }
  })
  await page.screenshot({ path: join(SHOTS, `${vp.name}__${label.replace(/\//g, '-')}.png`), fullPage: true })
  checked += 1
  const issues = []
  if (result.scrollOverflow > 1) issues.push(`rolagem horizontal da página (+${result.scrollOverflow}px)`)
  if (result.offenders.length) issues.push(`elementos fora da tela: ${result.offenders.join(' | ')}`)
  if (result.smallText) issues.push(`${result.smallText} textos com fonte menor que 11px`)
  logs.filter((l) => !/favicon/i.test(l)).forEach((l) => issues.push(`console → ${l}`))
  if (issues.length) problems.push({ vp: vp.name, label, issues })
  await page.close()
}

// E2E_ONLY=celular-360,tablet-768 roda só essas larguras; E2E_PERF=0 pula a medição de desempenho (útil para dividir em partes menores)
const ONLY = (process.env.E2E_ONLY ?? '').split(',').filter(Boolean)
for (const vp of VIEWPORTS.filter((v) => !ONLY.length || ONLY.includes(v.name))) {
  for (const route of ROUTES) await check(vp, route, '', route)
  for (const [label, query, route, click] of EXTRA) await check(vp, label, query, route, click)
}
// ---- muitos registros: tempo até a tela ficar pronta e ausência de estouro ----
const perf = []
const RUNS = Number(process.env.E2E_PERF_RUNS ?? 1) // várias repetições: o tempo oscila; use a mediana
for (const [route, click] of process.env.E2E_PERF === '0' ? [] : [['dashboard'], ['tarefas'], ['clientes'], ['financeiro', 'Tudo'], ['notas'], ['tempo']]) {
  const times = []
  let info = null
  for (let run = 0; run < RUNS; run++) {
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', (r) => (r.url().startsWith('http://localhost') ? r.continue() : r.abort()))
    await page.setViewport({ width: 390, height: 844 })
    const t0 = Date.now()
    await page.goto(`${base}?big=1200#/${route}`, { waitUntil: 'load' })
    await page.waitForSelector('h1', { timeout: 60000 })
    await page.waitForFunction(() => !document.body.innerText.includes('Carregando'), { timeout: 60000 }).catch(() => {})
    if (click) { const [btn] = await page.$$(`xpath/.//button[normalize-space()="${click}"]`); if (btn) await btn.click() }
    times.push(Date.now() - t0)
    info = await page.evaluate(() => ({ nodes: document.querySelectorAll('*').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
    await page.close()
  }
  times.sort((x, y) => x - y)
  const ms = times[Math.floor(times.length / 2)]
  perf.push({ route, ms, min: times[0], max: times[times.length - 1], ...info })
  if (ms > 8000) problems.push({ vp: 'celular-390', label: `desempenho ${route}`, issues: [`demorou ${ms} ms (mediana) com ~${info.nodes} elementos`] })
  if (info.overflow > 1) problems.push({ vp: 'celular-390', label: `muitos-registros ${route}`, issues: [`rolagem horizontal (+${info.overflow}px)`] })
}
console.log('Desempenho com ~1200 tarefas, 300 clientes, 200 notas, 400 lançamentos, 300 registros de tempo (celular 390px):')
for (const r of perf) console.log(`  ${r.route.padEnd(11)} mediana ${String(r.ms).padStart(5)} ms (mín ${r.min}, máx ${r.max})  ${String(r.nodes).padStart(6)} elementos no DOM`)
await browser.close(); server.close()
console.log(`Telas verificadas: ${checked} (${ONLY.length || VIEWPORTS.length} larguras × ${ROUTES.length + EXTRA.length} telas)`)
if (problems.length === 0) console.log('Nenhum problema encontrado.')
else { console.log(`Problemas em ${problems.length} telas:`); for (const p of problems) console.log(`- [${p.vp}] ${p.label}\n    ${p.issues.join('\n    ')}`) }
process.exitCode = problems.length ? 1 : 0
