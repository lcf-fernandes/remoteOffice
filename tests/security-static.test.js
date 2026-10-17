// Verificações ESTÁTICAS de segurança do código da aplicação (src/). Não substituem revisão nem as regras do Firestore.
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.(js|jsx)$/.test(n) ? [p] : [] })
const src = files('src').map((f) => [f, readFileSync(f, 'utf8')])
const offenders = (re) => src.filter(([, t]) => re.test(t)).map(([f]) => f)

describe('APIs perigosas e injeção', () => {
  it('nenhum HTML bruto é injetado (React escapa todo texto)', () => {
    assert.deepEqual(offenders(/dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/), [])
  })
  it('sem eval, new Function nem setTimeout/setInterval com texto', () => {
    assert.deepEqual(offenders(/\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/), [])
  })
  it('todo link que abre em nova aba usa rel="noopener noreferrer"', () => {
    for (const [file, text] of src) {
      for (const m of text.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="noopener noreferrer"/, `${file}: ${m[0].slice(0, 80)}`)
    }
  })
  it('links vindos de dados do usuário são revalidados ao LER, não só ao digitar', () => {
    assert.match(readFileSync('src/services/projects.js', 'utf8'), /links\.filter\(.*isValidUrl/) // links de projeto
    assert.match(readFileSync('src/utils/preferences.js', 'utf8'), /isValidExternalUrl\(l\.url\)/) // atalhos externos
    assert.doesNotMatch(src.map(([, t]) => t).join('\n'), /href=\{`mailto:\$\{/) // e-mail só via safeMailto
  })
  it('nenhum redirecionamento aberto: o app só muda o hash interno (#/…)', () => {
    for (const [file, text] of src) {
      for (const m of text.matchAll(/window\.location(?:\.href|\.assign|\.replace)?\s*(?:=|\()\s*([^;\n]+)/g)) {
        assert.match(m[1], /^['"`]#\//, `${file}: redirecionamento para fora do app → ${m[0].slice(0, 80)}`)
      }
    }
  })
})

describe('segredos e armazenamento', () => {
  it('nenhuma chave de API, token ou senha escrita no código', () => {
    assert.deepEqual(offenders(/AIza[0-9A-Za-z_-]{20,}|github_pat_|ghp_[A-Za-z0-9]{20}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password\s*[:=]\s*['"][^'"]{3,}['"]/), [])
  })
  it('a configuração do Firebase vem só de variáveis de ambiente', () => {
    const fb = readFileSync('src/services/firebase.js', 'utf8')
    assert.match(fb, /import\.meta\.env/)
    assert.doesNotMatch(fb, /apiKey:\s*['"]/)
  })
  it('arquivos .env e credenciais não estão versionados (só o .env.example)', () => {
    const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
    assert.deepEqual(tracked.filter((f) => /(^|\/)\.env($|\.(?!example))/.test(f) || /serviceAccount|credentials?\.json|\.pem$|\.key$/i.test(f)), [])
    assert.ok(tracked.includes('.env.example'))
    assert.match(readFileSync('.gitignore', 'utf8'), /^\.env$/m)
  })
  it('localStorage só guarda preferências não sensíveis (nenhuma senha, token ou dado de cliente)', () => {
    for (const [file, text] of src) for (const m of text.matchAll(/localStorage\.(?:setItem|getItem|removeItem)\(\s*([A-Za-z_'"`:-]+)/g)) assert.match(m[1], /LEGACY_KEY|KEY/, `${file}: chave inesperada ${m[1]}`)
    assert.deepEqual(offenders(/sessionStorage|indexedDB/), [])
  })
  it('o login nunca registra a senha em console ou armazenamento', () => {
    const login = readFileSync('src/features/auth/LoginPage.jsx', 'utf8')
    assert.doesNotMatch(login, /console\.(log|info|debug)|localStorage|sessionStorage/)
  })
})
