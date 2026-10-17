import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Build de TESTE para o navegador (tests/e2e): mesmo código do app, mas com o Firebase simulado. Não é a versão publicada.
const fake = (file) => fileURLToPath(new URL(`./tests/ui/fake-firebase/${file}`, import.meta.url))
const env = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID'].map((k) => [`import.meta.env.VITE_FIREBASE_${k}`, '"test"']))

export default defineConfig({
  root: 'tests/e2e',
  base: './',
  plugins: [react()],
  resolve: { alias: { 'firebase/app': fake('app.js'), 'firebase/auth': fake('auth.js'), 'firebase/firestore': fake('firestore.js') } },
  define: env,
  build: { outDir: process.env.E2E_OUT ?? '/tmp/e2e-dist', emptyOutDir: true },
})
