import { NavLink, Outlet } from 'react-router-dom'
import { useAppContext } from '../providers/app-context'
import { useGamification } from '../../modules/gamification/gamification-context'

const participantLinks = [
  { to: '/app', label: 'Visão geral', end: true },
  { to: '/app/ritual', label: 'Ritual do dia' },
  { to: '/app/missoes', label: 'Missões' },
  { to: '/app/programas', label: 'Programas' },
  { to: '/app/minha-evolucao', label: 'Minha evolução' },
  { to: '/app/conquistas', label: 'Conquistas' },
  { to: '/app/protocolo', label: 'Protocolo' },
  { to: '/app/perfil', label: 'Perfil' },
]

export function AppLayout() {
  const { user, tenant, membership, logout } = useAppContext()
  const gamification = useGamification()
  const links = ['CEO', 'MANAGER'].includes(membership.role)
    ? [...participantLinks, { to: '/app/administracao', label: 'Administração' }]
    : participantLinks

  return (
    <div className="app-shell">
      <header className="war-header">
        <div className="war-header-pattern" />
        <div className="war-brand">
          <span className="war-eyebrow">Spark Inteligência Corporativa</span>
          <strong>Disciplina <em>PRO</em></strong>
          <small>Sala de Guerra · Desenvolvimento e execução</small>
        </div>
        <div className="war-user">
          <div className="xp-panel">
            <span className="xp-medal">{gamification.level.medal}</span>
            <div><small>Nível {gamification.level.level}</small><strong>{gamification.level.name} · <em>{gamification.xp} XP</em></strong><span className="xp-track"><i style={{ width: `${gamification.progress}%` }} /></span></div>
          </div>
          <div className="war-identity"><div><strong>{user.email}</strong><small>{membership.role} · {tenant.name}</small></div><span className="war-avatar">{user.email.slice(0, 2).toUpperCase()}</span></div>
          <button className="war-logout" type="button" onClick={() => logout().catch(() => {})}>Sair</button>
        </div>
      </header>
      <nav className="war-nav" aria-label="Navegação principal">
        <div>{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</div>
        <span><i /> Ambiente de desenvolvimento</span>
      </nav>
      <main className="page"><Outlet /></main>
    </div>
  )
}
