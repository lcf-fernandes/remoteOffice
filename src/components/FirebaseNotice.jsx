import { ErrorState } from './states.jsx'
import { firebaseStatus } from '../services/firebase.js'

// Só aparece quando o Firebase não está configurado; explica o que falta sem expor valores.
export default function FirebaseNotice() {
  if (firebaseStatus.configured) return null
  return (
    <ErrorState title="Firebase não configurado">
      {firebaseStatus.error
        ? `Falha ao iniciar o Firebase: ${firebaseStatus.error}`
        : `Copie .env.example para .env e preencha: ${firebaseStatus.missing.join(', ')}. Veja docs/FIREBASE.md.`}
    </ErrorState>
  )
}
