import { ErrorState } from './states.jsx'
import { firebaseStatus } from '../services/firebase.js'

// Só aparece quando o Firebase não está configurado; explica o que falta sem expor valores.
export default function FirebaseNotice() {
  if (firebaseStatus.configured) return null
  return (
    <ErrorState title="Firebase não configurado">
      {firebaseStatus.error
        ? `Falha ao iniciar o Firebase: ${firebaseStatus.error}`
        : `Faltam as variáveis: ${firebaseStatus.missing.join(', ')}. Localmente, crie o arquivo .env a partir do .env.example. Na Vercel, cadastre-as em Settings → Environment Variables e faça um novo deploy. Veja docs/FIREBASE.md.`}
    </ErrorState>
  )
}
