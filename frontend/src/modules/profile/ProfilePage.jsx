import { useAppContext } from '../../app/providers/app-context'

export function ProfilePage() {
  const { user, tenant, membership } = useAppContext()
  return (
    <><section className="page-heading"><span className="eyebrow">Sua conta</span><h1>Perfil</h1><p>Dados simulados da futura sessão autenticada.</p></section><section className="profile-card"><div className="avatar large">EP</div><div><h2>{user.name}</h2><p>{user.email}</p><span>{membership.role} em {tenant.name}</span></div></section></>
  )
}
