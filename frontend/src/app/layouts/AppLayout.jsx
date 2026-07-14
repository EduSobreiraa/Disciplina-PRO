import { NavLink, Outlet } from 'react-router-dom'
import { useAppContext } from '../providers/app-context'

const links = [
  { to: '/app', label: 'Visão geral', end: true },
  { to: '/app/programas', label: 'Programas' },
  { to: '/app/minha-evolucao', label: 'Minha evolução' },
  { to: '/app/perfil', label: 'Perfil' },
]

export function AppLayout() {
  const { user, tenant, membership } = useAppContext()

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
            <span className="xp-medal">🥉</span>
            <div><small>Nível 1</small><strong>RECRUTA · <em>0 XP</em></strong><span className="xp-track"><i /></span></div>
          </div>
          <div className="war-identity"><div><strong>{user.name}</strong><small>{membership.role} · {tenant.name}</small></div><span className="war-avatar">EP</span></div>
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
