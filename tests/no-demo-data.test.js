// Garante que não restam dados de exemplo/demonstração no código da aplicação (fixtures só em testes: tests/).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : /\.(js|jsx|css|html)$/.test(name) ? [p] : []
  })
}
const FORBIDDEN = [/fixtures?/i, /demonstra[cç]/i, /\bdemo\b/i, /\bmock/i, /lorem ipsum/i, /dados de exemplo/i, /exemplo\.com/i]

describe('sem dados de exemplo no código da aplicação', () => {
  it('a pasta de fixtures não existe', () => assert.throws(() => statSync('src/dev')))
  it('nenhum arquivo de src/ ou index.html menciona fixtures, demonstração ou dados fictícios', () => {
    const hits = []
    for (const file of [...files('src'), 'index.html']) {
      const text = readFileSync(file, 'utf8')
      for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${file}: ${re}`)
    }
    assert.deepEqual(hits, [])
  })
})
