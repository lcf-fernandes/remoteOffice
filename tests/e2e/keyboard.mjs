// Auditoria de TECLADO, FOCO e ALVOS DE TOQUE no Chromium real. Requer puppeteer-core e @sparticuz/chromium (ver docs/TESTING.md).
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const DIST = process.env.E2E_OUT ?? '/tmp/e2e-dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = createServer((req, res) => { const f = join(DIST, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]); if (!existsSync(f)) { res.writeHead(404); return res.end() } res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)) })
await new Promise((r) => server.listen(0, r))
const base = `http://localhost:${server.address().port}/index.html`
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' })
const findings = []
const note = (area, msg) => findings.push(`[${area}] ${msg}`)

async function open(route, vp, query = '') {
  const page = await browser.newPage()
  await page.setRequestInterception(true); page.on('request', (r) => (r.url().startsWith('http://localhost') ? r.continue() : r.abort()))
  await page.setViewport(vp)
  await page.goto(`${base}${query}#/${route}`, { waitUntil: 'load' })
  await page.waitForSelector('h1'); await page.waitForFunction(() => !document.body.innerText.includes('Carregando'), { timeout: 15000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 300))
  return page
}
const active = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
  const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
  // indicador de foco: sombra ou contorno visível
  const ring = (cs.boxShadow && cs.boxShadow !== 'none') || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0)
  return { tag: el.tagName.toLowerCase(), name, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), vis: cs.visibility, ring: !!ring, inDialog: !!el.closest('dialog[open]'), vw: innerWidth, vh: innerHeight }
})

// 1) tabulação: o primeiro foco é o link de pular? algum foco cai em algo invisível/fora da tela? todo foco tem indicador?
for (const [label, vp] of [['desktop', { width: 1366, height: 768 }], ['celular', { width: 390, height: 844 }]]) {
  for (const route of ['dashboard', 'tarefas', 'clientes', 'projetos', 'financeiro', 'tempo', 'configuracoes']) {
    const page = await open(route, vp)
    const seen = []
    for (let i = 0; i < 70; i++) { await page.keyboard.press('Tab'); const a = await active(page); if (!a) break; seen.push(a) }
    if (!seen[0] || !/conteúdo/i.test(seen[0].name)) note(`${label} ${route}`, `primeiro Tab não vai para "Ir para o conteúdo" (foi: ${seen[0]?.name ?? 'nada'})`)
    const ghosts = seen.filter((a) => a.vis === 'hidden' || a.w === 0 || a.h === 0 || a.right <= 0 || a.left >= a.vw)
    if (ghosts.length) note(`${label} ${route}`, `foco em elemento invisível/fora da tela ×${ghosts.length}: ${[...new Set(ghosts.map((g) => `${g.tag} "${g.name}"`))].slice(0, 4).join(' | ')}`)
    const noRing = seen.filter((a) => !a.ring && a.w > 0)
    if (noRing.length) note(`${label} ${route}`, `foco SEM indicador visível ×${noRing.length}: ${[...new Set(noRing.map((g) => `${g.tag} "${g.name}"`))].slice(0, 4).join(' | ')}`)
    await page.close()
  }
}

// 2) diálogo: abrir pelo teclado, foco dentro, Tab não escapa, Esc fecha e devolve o foco
{
  const page = await open('tarefas', { width: 1366, height: 768 })
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Nova tarefa').focus())
  await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 200))
  let a = await active(page)
  if (!a?.inDialog) note('diálogo', `ao abrir, o foco não entra no diálogo (está em ${a?.tag} "${a?.name}")`)
  let escaped = 0
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); a = await active(page); if (a && !a.inDialog) escaped++ }
  if (escaped) note('diálogo', `Tab saiu do diálogo ×${escaped}`)
  await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 200))
  a = await active(page)
  if (!a || !/Nova tarefa/.test(a.name)) note('diálogo', `ao fechar com Esc, o foco não volta ao botão que abriu (está em ${a ? `${a.tag} "${a.name}"` : 'nada'})`)
  await page.close()
}

// 3) menu "Criar": é um menu ARIA? então setas precisam funcionar; senão não deve usar role=menu
{
  const page = await open('dashboard', { width: 1366, height: 768 })
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Criar').focus())
  await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 150))
  const hasRole = await page.evaluate(() => !!document.querySelector('[role="menu"]'))
  await page.keyboard.press('ArrowDown'); await new Promise((r) => setTimeout(r, 100))
  const a = await active(page)
  if (hasRole && !(a && a.tag === 'button' && /Nova|Novo|Registro/.test(a.name))) note('menu Criar', 'usa role="menu" mas as setas não navegam entre os itens (padrão ARIA exige)')
  await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 100))
  const a2 = await active(page)
  if (!(a2 && /Criar/.test(a2.name))) note('menu Criar', `Esc não devolve o foco ao botão "Criar" (está em ${a2 ? a2.name : 'nada'})`)
  await page.close()
}

// 4) gaveta do celular: foco entra/sai corretamente; itens da gaveta fechada não são tabuláveis
{
  const page = await open('dashboard', { width: 390, height: 844 })
  const closedTabbable = await page.evaluate(() => [...document.querySelectorAll('.col--left a, .col--left button, .col--left input, .col--left select, .col--left textarea')].filter((e) => getComputedStyle(e).visibility !== 'hidden').length)
  if (closedTabbable) note('gaveta (celular)', `com a gaveta FECHADA, ${closedTabbable} controles dela ainda recebem foco por Tab (invisíveis)`)
  await page.evaluate(() => document.querySelector('.topbar button').focus()); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 300))
  let a = await active(page)
  if (!a || !(a.right > 0 && a.left < a.vw) ) note('gaveta (celular)', 'ao abrir a gaveta, o foco não vai para um item dela')
  await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 300))
  a = await active(page)
  if (!a || a.tag !== 'button' || !/menu/i.test(a.name)) note('gaveta (celular)', `ao fechar com Esc, o foco não volta ao botão do menu (está em ${a ? `${a.tag} "${a.name}"` : 'nada'})`)
  await page.close()
}

// 5) navegação por rota: título da aba e foco
{
  const page = await open('dashboard', { width: 1366, height: 768 })
  const t0 = await page.title()
  await page.evaluate(() => [...document.querySelectorAll('nav a')].find((a) => a.textContent.includes('Clientes')).click()); await new Promise((r) => setTimeout(r, 400))
  const t1 = await page.title()
  if (t1 === t0 || !/Clientes/.test(t1)) note('navegação', `o título da aba não muda com a tela (antes "${t0}", depois "${t1}")`)
  const a = await active(page)
  const inMain = await page.evaluate(() => document.activeElement && document.activeElement.closest('main') !== null || document.activeElement?.id === 'conteudo')
  if (!inMain) note('navegação', `ao trocar de tela, o foco continua no menu (${a ? a.name : 'nada'}) em vez de ir para o conteúdo`)
  await page.close()
}

// 6) alvos de toque no celular (WCAG 2.2 AA: 24×24 px; recomendado 44×44) em várias telas
{
  const found = new Map()
  for (const route of ['dashboard', 'tarefas', 'clientes', 'clientes/c1', 'projetos', 'projetos/p1', 'modelos', 'agenda', 'comercial', 'comercial/r1', 'financeiro', 'tempo', 'notas', 'configuracoes']) {
    const page = await open(route, { width: 390, height: 844 })
    const small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button]')) {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
        if (!r.width || cs.visibility === 'hidden' || el.closest('.col--left:not(.is-open)')) continue
        if (el.tagName === 'A' && cs.display === 'inline') continue // link dentro de texto: isento
        if (el.type === 'checkbox' || el.type === 'radio') continue // controles nativos: o rótulo clicável conta como alvo
        if (r.width < 24 || r.height < 24) out.push(`${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 28)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
      }
      return out
    })
    for (const x of small) { if (!found.has(x)) found.set(x, new Set()); found.get(x).add(route) }
    await page.close()
  }
  for (const [x, where] of found) note('alvo de toque < 24×24 (390px)', `${x}  em: ${[...where].slice(0, 3).join(', ')}`)
}

await browser.close(); server.close()
if (!findings.length) console.log('Teclado/foco/alvos: nenhum problema encontrado.')
else { console.log(`Problemas de teclado/foco (${findings.length}):`); findings.forEach((f) => console.log('- ' + f)) }
process.exitCode = findings.length ? 1 : 0
