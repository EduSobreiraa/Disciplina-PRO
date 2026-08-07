import { Navigate } from 'react-router-dom'
import { useTenantAdministration } from '../hooks/useTenantAdministration'
import { TeamAdministrationPanel } from '../components/TeamAdministrationPanel'
import { MembershipAdministrationPanel } from '../components/MembershipAdministrationPanel'
import { InvitationAdministrationPanel } from '../components/InvitationAdministrationPanel'
import { AdministrationInsightsPanel } from '../components/AdministrationInsightsPanel'
import '../styles/tenant-administration.css'

export function TenantAdministrationPage() {
  const administration = useTenantAdministration()
  if (!administration.canManage) return <Navigate to="/app" replace />

  return <>
    <header className="page-heading"><span className="eyebrow">Administração da organização</span><h1>Pessoas e <em>times</em></h1><p>Visão limitada pelo seu papel e pelo escopo autorizado no servidor.</p></header>
    {administration.status === 'loading' && <section className="admin-state" role="status">Carregando estrutura da organização…</section>}
    {administration.status === 'error' && <section className="admin-state error" role="alert"><strong>Não foi possível carregar a administração.</strong><span>{administration.error?.message}</span><button className="button" type="button" onClick={() => administration.reload().catch(() => {})}>Tentar novamente</button></section>}
    {administration.status === 'ready' && <div className="admin-layout">
      <MembershipAdministrationPanel administration={administration} />
      {administration.canManageTeams ? <TeamAdministrationPanel administration={administration} /> : <section className="admin-panel"><header><div><span>Escopo gerencial</span><h2>Somente equipes atribuídas</h2></div></header><p className="admin-empty">A API já restringiu a lista de pessoas aos seus times. A gestão estrutural de times pertence ao CEO.</p></section>}
      <InvitationAdministrationPanel administration={administration} />
      <AdministrationInsightsPanel administration={administration} />
    </div>}
  </>
}
