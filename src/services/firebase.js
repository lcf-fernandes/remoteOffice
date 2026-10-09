// Commit 08 — único ponto de inicialização do Firebase.
// A interface nunca importa o SDK diretamente: usa este módulo (e, a partir do commit 09, os serviços de dados).
// A configuração do Firebase é pública por natureza; quem protege os dados são as regras do Firestore.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

const missing = REQUIRED.filter((key) => !env[key])

export const firebaseStatus = {
  configured: missing.length === 0,
  missing,
}

let app = null
let auth = null
let db = null

if (firebaseStatus.configured) {
  try {
    app = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
    auth = getAuth(app)
    db = getFirestore(app)
  } catch (error) {
    firebaseStatus.configured = false
    firebaseStatus.error = error.message
  }
}

export { app, auth, db }
