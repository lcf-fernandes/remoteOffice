import { useState } from 'react'
import Button from '../../components/Button.jsx'
import { Input } from '../../components/Field.jsx'
import { authErrorMessage, requestPasswordReset, signIn } from '../../services/auth.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim() || !password) return setError('Informe e-mail e senha.')
    setBusy(true)
    try {
      await signIn(email.trim(), password) // o AuthProvider reage à mudança de sessão
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  async function onReset() {
    setError(''); setInfo('')
    if (!email.trim()) return setError('Digite seu e-mail para receber o link de recuperação.')
    try {
      await requestPasswordReset(email.trim())
    } catch (err) {
      // Mensagem neutra para não revelar se o e-mail existe.
      if (err?.code !== 'auth/user-not-found') return setError(authErrorMessage(err))
    }
    setInfo('Se este e-mail tiver uma conta, enviamos um link para redefinir a senha.')
  }

  return (
    <main className="login">
      <form className="card login__card" onSubmit={onSubmit} noValidate>
        <h1 className="login__title">Leandro Desk</h1>
        <p className="card__hint">Entre para acessar seu escritório.</p>
        <Input label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="field__error" role="alert">{error}</p>}
        {info && <p className="login__info" role="status">{info}</p>}
        <Button type="submit" variant="primary" loading={busy}>Entrar</Button>
        <Button variant="ghost" onClick={onReset}>Esqueci a senha</Button>
      </form>
    </main>
  )
}
