// Testes das regras do Firestore. Rodam no emulador: npm run test:rules (requer Java e firebase-tools).
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

let env
const profile = { email: 'a@x.com', displayName: '', preferences: { locale: 'pt-BR' } }

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'leandro-desk-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(() => env.cleanup())

describe('firestore.rules', () => {
  it('nega leitura para usuário não autenticado', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')))
  })
  it('permite ao dono criar e ler o próprio perfil', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
  })
  it('nega acesso ao perfil de outro usuário', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice')))
    await assertFails(setDoc(doc(db, 'users/alice'), profile))
  })
  it('nega campos extras no perfil (ex.: role)', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertFails(setDoc(doc(db, 'users/carol'), { ...profile, role: 'admin' }))
  })
  it('permite ao dono gravar em subcoleções e nega a outros', async () => {
    await assertSucceeds(setDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice/tasks/t1'), { title: 'x' }))
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/tasks/t2'), { title: 'x' }))
  })
  it('nega coleções fora de users/', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'public/x'), { a: 1 }))
  })
})
