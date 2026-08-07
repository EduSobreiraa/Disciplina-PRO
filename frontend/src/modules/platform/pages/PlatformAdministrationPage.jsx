import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/app-context'
import { usePlatformAdministration } from '../hooks/usePlatformAdministration'
import '../styles/platform-administration.css'

const statusLabel = { PENDING: 'Pendente', ACTIVE: 'Ativo', SUSPENDED: 'Suspenso', CLOSED: 'Encerrado' }

export function PlatformAdministrationPage() {
  const session = useAppContext()
  const platform = usePlatformAdministration()
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', timeZone: 'America/Bahia' })
  const [ceoEmails, setCeoEmails] = useState({})
  if (!platform.allowed) return <Navigate to={session.tenant ? '/app' : '/login'} replace />

  async function createTenant(event) {
    event.preventDefault()
    await platform.createTenant(tenantForm)
    setTenantForm({ name: '', slug: '', timeZone: 'America/Bahia' })
  }

  async function transition(tenant, action) {
    const verb = action === 'close' ? 'encerrar definitivamente' : action === 'suspend' ? 'suspender' : 'reativar'
    const reason = window.prompt(`Motivo para ${verb} ${tenant.name}:`)
    if (reason?.trim()) await platform.transitionTenant(tenant.id, action, reason.trim())
  }

  return <main className="platform-page">
    <header className="platform-header">
      <div><span className="eyebrow">Administração de plataforma</span><h1>Disciplina <em>PRO</em></h1><p>Fronteira global sem contexto ou permissões de uma organização.</p></div>
      <div><strong>{session.user.email}</strong><small>SUPER_ADMIN</small><button type="button" onClick={() => session.logout()}>Sair</button></div>
    </header>
    {platform.status === 'loading' && <section className="admin-state" role="status">Carregando plataforma…</section>}
    {platform.status === 'error' && <section className="admin-state error" role="alert"><strong>Não foi possível carregar a plataforma.</strong><span>{platform.error?.message}</span><button className="button" type="button" onClick={() => platform.reload().catch(() => {})}>Tentar novamente</button></section>}
    {platform.status === 'ready' && <div className="platform-grid">
      <section className="platform-panel">
        <header><span>Novo tenant</span><h2>Criar organização</h2></header>
        <form className="platform-form" onSubmit={(event) => createTenant(event).catch(() => {})}>
          <label>Nome<input required maxLength="160" value={tenantForm.name} onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })} /></label>
          <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength="80" value={tenantForm.slug} onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value })} /></label>
          <label>Timezone<input required maxLength="100" value={tenantForm.timeZone} onChange={(event) => setTenantForm({ ...tenantForm, timeZone: event.target.value })} /></label>
          <button className="button" disabled={platform.mutating}>Criar pendente</button>
        </form>
      </section>

      <section className="platform-panel platform-tenants">
        <header><span>Lifecycle empresarial</span><h2>Tenants</h2></header>
        {platform.delivery && <p className={`admin-delivery ${platform.delivery.status === 'FAILED' ? 'failed' : ''}`}>Convite para {platform.delivery.email}: {platform.delivery.status === 'SENT' ? 'enviado' : 'falha no transporte'}.</p>}
        {platform.tenants.length === 0 ? <p className="admin-empty">Nenhum tenant cadastrado.</p> : <div className="platform-list">{platform.tenants.map((tenant) => <article key={tenant.id}>
          <div className="platform-tenant-heading"><div><strong>{tenant.name}</strong><span>{tenant.slug} · {tenant.timeZone}</span></div><b className={`admin-status ${tenant.status.toLowerCase()}`}>{statusLabel[tenant.status]}</b></div>
          <p>{tenant.activeCeo ? <>CEO ativo: <strong>{tenant.activeCeo.email}</strong></> : tenant.pendingCeoInvitation ? <>Convite de CEO pendente: <strong>{tenant.pendingCeoInvitation.email}</strong></> : 'Primeiro CEO ainda não convidado.'}</p>
          {tenant.status === 'PENDING' && !tenant.activeCeo && !tenant.pendingCeoInvitation && <form className="platform-inline" onSubmit={(event) => { event.preventDefault(); platform.inviteFirstCeo(tenant.id, ceoEmails[tenant.id] ?? '').catch(() => {}) }}><input required type="email" placeholder="ceo@empresa.com" value={ceoEmails[tenant.id] ?? ''} onChange={(event) => setCeoEmails({ ...ceoEmails, [tenant.id]: event.target.value })} /><button disabled={platform.mutating}>Convidar primeiro CEO</button></form>}
          <div className="platform-actions">
            {tenant.status === 'ACTIVE' && <button disabled={platform.mutating} onClick={() => transition(tenant, 'suspend').catch(() => {})}>Suspender</button>}
            {tenant.status === 'SUSPENDED' && <button disabled={platform.mutating} onClick={() => transition(tenant, 'reactivate').catch(() => {})}>Reativar</button>}
            {tenant.status !== 'CLOSED' && <button className="danger" disabled={platform.mutating} onClick={() => transition(tenant, 'close').catch(() => {})}>Encerrar</button>}
          </div>
        </article>)}</div>}
      </section>

      <section className="platform-panel platform-programs">
        <header><span>Disponibilidade comercial</span><h2>Programas por tenant</h2></header>
        {platform.programs.length === 0 ? <p className="admin-empty">Nenhum programa global cadastrado.</p> : <div className="platform-program-list">{platform.programs.map((program) => {
          const published = program.versions.find((version) => version.status === 'PUBLISHED')
          return <article key={program.id}><div><strong>{program.name}</strong><span>{program.slug} · {published ? `versão ${published.versionNumber} publicada` : 'sem versão publicada'}</span></div>
            <div>{platform.tenants.filter((tenant) => tenant.status !== 'CLOSED').map((tenant) => {
              const relation = program.tenantPrograms.find((item) => item.tenantId === tenant.id)
              const enabled = relation?.status === 'ENABLED'
              const canEnable = program.status === 'ACTIVE' && tenant.status === 'ACTIVE' && Boolean(published)
              return <label key={tenant.id}><span>{tenant.name}</span><input type="checkbox" checked={enabled} disabled={platform.mutating || (!enabled && !canEnable)} onChange={() => platform.setProgramEnabled(tenant.id, program.id, !enabled).catch(() => {})} /></label>
            })}</div>
          </article>
        })}</div>}
      </section>
      {platform.error && <p className="admin-action-error" role="alert">{platform.error.message}</p>}
    </div>}
  </main>
}
