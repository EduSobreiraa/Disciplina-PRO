import { useMemo, useState } from 'react'

const roleLabels = { CEO: 'Direção', MANAGER: 'Gestor', USER: 'Participante' }
const statusLabels = { ACTIVE: 'Ativo', SUSPENDED: 'Suspenso', INACTIVE: 'Inativo' }

export function MembershipAdministrationPanel({ administration }) {
  const [transition, setTransition] = useState(null)
  const [reason, setReason] = useState('')
  const [assignment, setAssignment] = useState({ membershipId: '', teamId: '', role: 'MEMBER' })
  const activeTeams = useMemo(() => administration.teams.filter(({ archivedAt }) => !archivedAt), [administration.teams])
  const assignableMembers = administration.memberships.filter(({ role, status }) => role !== 'CEO' && status === 'ACTIVE')

  function allowedTransitions(membership) {
    if (membership.role === 'CEO') return []
    if (membership.status !== 'ACTIVE') return ['reactivate']
    return administration.canManageTeams ? ['suspend', 'inactivate'] : membership.role === 'USER' ? ['inactivate'] : []
  }

  async function confirmTransition(event) {
    event.preventDefault()
    if (await administration.changeMembershipStatus(transition.membership.id, transition.action, reason.trim())) {
      setTransition(null)
      setReason('')
    }
  }

  async function assign(event) {
    event.preventDefault()
    if (await administration.assignTeamMembership(assignment.teamId, assignment.membershipId, assignment.role)) setAssignment({ membershipId: '', teamId: '', role: 'MEMBER' })
  }

  return <section className="admin-panel admin-members"><header><div><span>Membros visíveis</span><h2>{administration.memberships.length} pessoas</h2></div></header>
    {administration.canManageTeams && <form className="admin-assignment-form" onSubmit={(event) => assign(event).catch(() => {})}><strong>Vincular a um time</strong><select aria-label="Membro" required value={assignment.membershipId} onChange={(event) => { const membershipId = event.target.value; const member = administration.memberships.find(({ id }) => id === membershipId); setAssignment((current) => ({ ...current, membershipId, role: member?.role === 'MANAGER' ? 'MANAGER' : 'MEMBER' })) }}><option value="">Selecione a pessoa</option>{assignableMembers.map((membership) => <option key={membership.id} value={membership.id}>{membership.user.email}</option>)}</select><select aria-label="Time" required value={assignment.teamId} onChange={(event) => setAssignment((current) => ({ ...current, teamId: event.target.value }))}><option value="">Selecione o time</option>{activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select aria-label="Papel no time" value={assignment.role} onChange={(event) => setAssignment((current) => ({ ...current, role: event.target.value }))}><option value="MEMBER">Membro</option>{administration.memberships.find(({ id }) => id === assignment.membershipId)?.role === 'MANAGER' && <option value="MANAGER">Gestor</option>}</select><button className="button" disabled={administration.mutating} type="submit">Vincular</button></form>}
    {administration.error && <p className="admin-action-error" role="alert">{administration.error.message}</p>}
    <div className="admin-list">{administration.memberships.map((membership) => <article className="admin-member" key={membership.id}><div className="avatar">{membership.user.email.slice(0, 2).toUpperCase()}</div><div className="admin-member-main"><strong>{membership.user.email}</strong><span>{roleLabels[membership.role] ?? membership.role}</span><div className="admin-team-chips">{membership.teams?.map((assignment) => <span key={assignment.id}>{assignment.team.name} · {assignment.role === 'MANAGER' ? 'Gestor' : 'Membro'}{administration.canManageTeams && <button aria-label={`Remover ${membership.user.email} de ${assignment.team.name}`} disabled={administration.mutating} type="button" onClick={() => administration.endTeamMembership(assignment.teamId, membership.id).catch(() => {})}>×</button>}</span>)}</div></div><small className={`admin-status ${membership.status.toLowerCase()}`}>{statusLabels[membership.status] ?? membership.status}</small><div className="admin-member-actions">{administration.canManageTeams && membership.role !== 'CEO' && membership.status === 'ACTIVE' && <button disabled={administration.mutating} type="button" onClick={() => administration.changeMembershipRole(membership.id, membership.role === 'MANAGER' ? 'USER' : 'MANAGER').catch(() => {})}>{membership.role === 'MANAGER' ? 'Tornar participante' : 'Tornar gestor'}</button>}{allowedTransitions(membership).map((action) => <button disabled={administration.mutating} key={action} type="button" onClick={() => setTransition({ membership, action })}>{action === 'suspend' ? 'Suspender' : action === 'inactivate' ? 'Inativar' : 'Reativar'}</button>)}</div></article>)}</div>
    {transition && <div className="admin-dialog-backdrop"><form className="admin-dialog" onSubmit={(event) => confirmTransition(event).catch(() => {})}><span className="eyebrow">Confirmar alteração</span><h3>{transition.membership.user.email}</h3><label htmlFor="membership-reason">Motivo operacional</label><textarea id="membership-reason" minLength="3" maxLength="500" required value={reason} onChange={(event) => setReason(event.target.value)} /><div><button type="button" onClick={() => setTransition(null)}>Cancelar</button><button className="button" disabled={administration.mutating} type="submit">Confirmar</button></div></form></div>}
  </section>
}
