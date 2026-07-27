import { useAppContext } from '../../app/providers/app-context'

export function ProfilePage() {
  const { user, tenant, membership } = useAppContext()
  return (
    <><section className="page-heading"><span className="eyebrow">Sua conta</span><h1>Perfil</h1><p>Identidade e organização da sessão autenticada.</p></section><section className="profile-card"><div className="avatar large">{user.email.slice(0, 2).toUpperCase()}</div><div><h2>{user.email}</h2><span>{membership.role} em {tenant.name}</span></div></section></>
  )
}
