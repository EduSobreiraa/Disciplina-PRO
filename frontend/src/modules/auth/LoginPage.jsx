import { Link } from 'react-router-dom'

export function LoginPage() {
  return <main className="login-page"><section className="login-card"><span className="brand-mark">DP</span><span className="eyebrow">Spark Inteligência Corporativa</span><h1>Disciplina PRO</h1><p>Acesse seus programas de desenvolvimento.</p><label>E-mail<input type="email" placeholder="voce@empresa.com.br" /></label><label>Senha<input type="password" placeholder="••••••••" /></label><Link className="button" to="/app">Entrar no ambiente simulado</Link></section></main>
}
