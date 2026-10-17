// Verificação ESTÁTICA do firestore.rules. NÃO substitui rodar as regras no emulador (npm run test:rules): só trava regressões
// óbvias que causariam acesso cruzado entre usuários ou coleções sem regra. Se algum destes testes falhar, as regras NÃO devem ser
// "afrouxadas" para passar: corrija a causa.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const rules = readFileSync('firestore.rules', 'utf8')
const code = rules.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n') // sem comentários

// todas as instruções "allow ...: if <condição>;" (a condição pode ocupar várias linhas)
const allows = [...code.matchAll(/allow\s+([a-z, ]+?)\s*:\s*if\s+([^;]+);/gs)].map((m) => ({ ops: m[1].split(',').map((s) => s.trim()), cond: m[2].replace(/\s+/g, ' ').trim() }))

describe('regras: acesso cruzado e estrutura', () => {
  it('há regras e uma regra final que NEGA tudo o que não foi listado', () => {
    assert.ok(allows.length > 20)
    assert.match(code, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/)
  })
  it('nenhuma regra libera acesso sem verificar o dono (isOwner) — exceto a que nega tudo', () => {
    const open = allows.filter((a) => a.cond !== 'false' && !/isOwner\(uid\)/.test(a.cond))
    assert.deepEqual(open, [])
  })
  it('nenhuma regra é "if true" nem depende só de estar autenticado', () => {
    assert.equal(allows.filter((a) => /^true$/.test(a.cond) || /^request\.auth != null$/.test(a.cond)).length, 0)
  })
  it('na raiz do banco só existem: users/{uid} (com tudo dentro dele) e a regra que nega o resto', () => {
    // percorre as chaves para saber a profundidade de cada "match"
    const found = []
    let depth = 0
    for (const m of code.matchAll(/match\s+(\/[^\s{]*(?:\{[^}]*\}[^\s{]*)*)\s*\{|\{|\}/g)) {
      if (m[0].startsWith('match')) { found.push({ depth, path: m[1] }); depth += 1 } else if (m[0] === '{') depth += 1; else depth -= 1
    }
    const atDocuments = found.filter((f) => f.depth === 2).map((f) => f.path) // filhos de /databases/{database}/documents (service = 0, databases = 1)
    assert.deepEqual(atDocuments, ['/users/{uid}', '/{document=**}'])
    assert.equal(found.filter((f) => f.depth >= 3).every((f) => !f.path.startsWith('/users')), true, 'sem outro users/ aninhado')
    assert.ok(found.filter((f) => f.depth >= 3).length >= 14, 'coleções aninhadas dentro de users/{uid}')
  })
  it('a identidade do dono vem de request.auth.uid, nunca de um campo editável do documento', () => {
    assert.match(code, /function isOwner\(uid\)\s*\{\s*return request\.auth != null && request\.auth\.uid == uid;\s*\}/)
    assert.doesNotMatch(code, /resource\.data\.(owner|userId|uid|role|isAdmin|admin)/i)
    assert.doesNotMatch(code, /request\.resource\.data\.(owner|userId|uid|role|isAdmin|admin)\b/i)
  })
  it('perfil não pode ser excluído; histórico de propostas e ajustes de tempo não podem ser editados', () => {
    assert.match(code, /match \/users\/\{uid\} \{[^}]*allow delete: if false;/s)
    assert.match(code, /match \/history\/\{entryId\} \{[^}]*allow update: if false;/s)
    assert.match(code, /match \/revisions\/\{revisionId\} \{[^}]*allow update: if false;/s)
  })
  it('todo create/update libera só com validação de campos (função valid*() ou hasOnly inline)', () => {
    const writes = allows.filter((a) => a.ops.some((o) => ['create', 'update'].includes(o)) && a.cond !== 'false')
    const unvalidated = writes.filter((a) => !/valid[A-Za-z]+\(\)/.test(a.cond) && !/\.keys\(\)\.hasOnly\(/.test(a.cond))
    assert.deepEqual(unvalidated.map((a) => a.cond), [])
  })
  it('todas as funções valid* limitam as chaves aceitas (hasOnly) para impedir campos extras', () => {
    const fns = [...code.matchAll(/function (valid[A-Za-z]+)\(([^)]*)\)\s*\{([\s\S]*?)\n    \}/g)]
    assert.ok(fns.length >= 15)
    for (const [, name, , body] of fns) assert.match(body, /hasOnly\(|validPreferences|p is map/, `${name} deve restringir as chaves`)
  })
})

describe('regras: cobertura das coleções usadas pelo código', () => {
  const services = join('src', 'services')
  const used = new Set()
  for (const f of readdirSync(services)) {
    const text = readFileSync(join(services, f), 'utf8')
    for (const m of text.matchAll(/'users', uid, '([A-Za-z]+)'(?:, [a-zA-Z.]+, '([A-Za-z]+)')?/g)) { used.add(m[1]); if (m[2]) used.add(m[2]) }
  }
  it('o código usa coleções (varredura funcionou)', () => assert.ok(used.size >= 12, [...used].join(',')))
  for (const name of used) it(`coleção "${name}" tem regra própria`, () => assert.match(code, new RegExp(`match /${name}/\\{`)))
})
