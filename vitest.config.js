import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Testes de INTERFACE: rodam o app em jsdom com um Firebase simulado em memória (tests/ui/fake-firebase).
// Não testam as regras de segurança do Firestore (isso exige o emulador: npm run test:rules).
const fake = (file) => fileURLToPath(new URL(`./tests/ui/fake-firebase/${file}`, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { 'firebase/app': fake('app.js'), 'firebase/auth': fake('auth.js'), 'firebase/firestore': fake('firestore.js') } },
  test: {
    environment: 'jsdom',
    include: ['tests/ui/**/*.test.jsx'],
    setupFiles: ['tests/ui/setup.js'],
    css: false,
    testTimeout: 20000,
    env: {
      VITE_FIREBASE_API_KEY: 'test', VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'test',
      VITE_FIREBASE_APP_ID: 'test', VITE_FIREBASE_STORAGE_BUCKET: 'test', VITE_FIREBASE_MESSAGING_SENDER_ID: '1',
    },
  },
})
