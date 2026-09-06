import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../../app/providers/app-context'
import { acceptInvitation, readInvitationToken } from './invitation-acceptance.client'

export function InvitationAcceptancePage() {
  const session = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  const token = readInvitationToken(location.hash)
  const [existing, setExisting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [accepted, setAccepted] = useState(false)
  const existingIdentity = existing || session.authenticated

  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    setMessage('')
    if (!existingIdentity && password !== confirmation) {
      setMessage('As senhas precisam ser iguais.')
      return
    }
    setSubmitting(true)
    try {
      if (existingIdentity && !session.authenticated) await session.sessionClient.login(email, password)
      await acceptInvitation({ token, password, sessionClient: session.sessionClient, existingIdentity })
      setPassword('')
      setConfirmation('')
      setAccepted(true)
      navigate('/convites/aceitar', { replace: true })
    } catch (error) {
      if (error.code === 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED') {
        setExisting(true)
        setPassword('')
        setConfirmation('')
        setMessage('Este e-mail já possui uma conta. Entre com a senha dessa conta para aceitar o convite.')
      } else if (error.code === 'INVITATION_INVALID') {
        setMessage('Convite inválido, expirado, já utilizado ou destinado a outra conta. Confira o link mais recente e a conta utilizada.')
      } else if (error.code === 'INVALID_INVITATION_DATA') {
        setMessage('Confira o convite e use uma senha de 15 a 128 caracteres.')
      } else {
        setMessage('Não foi possível concluir. Confira suas credenciais e conexão e tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="invitation-title">
        <span className="brand-mark">DP</span>
        <span className="eyebrow">Disciplina PRO</span>
        <h1 id="invitation-title">Aceitar convite</h1>
        {accepted ? <>
          <p role="status">Convite aceito! Seu acesso à organização está liberado.</p>
          <a className="button" href={existingIdentity ? '/app' : '/login'}>Entrar no Disciplina PRO</a>
        </> : !token ? <>
          <p role="alert">Link de convite inválido ou incompleto. Abra o botão do e-mail mais recente ou solicite um novo convite ao administrador.</p>
          <a href="/login">Voltar ao login</a>
        </> : session.status === 'loading' ? <p role="status">Verificando sessão…</p> : <>
          <p>{existingIdentity ? 'Use a conta do e-mail que recebeu o convite.' : 'Crie sua senha para ativar a conta do e-mail que recebeu o convite.'}</p>
          <form onSubmit={submit}>
            {session.authenticated ? <p>Conta conectada: {session.user?.email}</p> : <>
              {existing && <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
              <label>{existing ? 'Senha' : 'Crie sua senha'}<input required type="password" minLength={existing ? undefined : 15} maxLength={128} autoComplete={existing ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              {!existing && <>
                <p>Use de 15 a 128 caracteres. Você pode usar uma frase longa.</p>
                <label>Confirme sua senha<input required type="password" minLength={15} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
              </>}
            </>}
            <button className="button" type="submit" disabled={submitting}>{submitting ? 'Aceitando…' : existingIdentity ? 'Aceitar convite' : 'Criar conta e aceitar convite'}</button>
            {message && <p role="alert">{message}</p>}
          </form>
          {session.authenticated ? <button className="button" disabled={submitting} onClick={async () => { await session.logout(); setExisting(true); setPassword('') }}>Usar outra conta</button> : <button className="button" disabled={submitting} onClick={() => { setExisting(!existing); setPassword(''); setConfirmation(''); setMessage('') }}>{existing ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>}
        </>}
      </section>
    </main>
  )
}
