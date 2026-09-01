import { useAdministrationInsights } from '../hooks/useAdministrationInsights'

const actionLabels = {
  TEAM_CREATED: 'Time criado', TEAM_UPDATED: 'Time renomeado', TEAM_ARCHIVED: 'Time arquivado', TEAM_RESTORED: 'Time restaurado',
  TEAM_MEMBERSHIP_ASSIGNED: 'Pessoa vinculada ao time', TEAM_MEMBERSHIP_ENDED: 'Vínculo de time encerrado',
  MEMBERSHIP_ROLE_CHANGED: 'Papel organizacional alterado', MEMBERSHIP_SUSPENDED: 'Acesso suspenso', MEMBERSHIP_INACTIVATED: 'Acesso inativado', MEMBERSHIP_REACTIVATED: 'Acesso reativado',
  INVITATION_CREATED: 'Convite criado', INVITATION_RESENT: 'Convite reenviado', INVITATION_REVOKED: 'Convite revogado',
  DAILY_RECORD_SUBMITTED: 'Registro diário concluído', ACTIVITY_COMPLETION_RECORDED: 'Atividade concluída', ENROLLMENT_STARTED: 'Programa iniciado', ENROLLMENT_COMPLETED: 'Programa concluído',
  TENANT_PROGRAM_ENABLED: 'Programa liberado para a organização', TENANT_PROGRAM_DISABLED: 'Programa removido da organização',
}

const entityTypeLabels = {
  TenantProgram: 'Disponibilidade do programa',
}

function programSummary(program) {
  return `${program.activeEnrollments} ciclos em andamento · ${program.activityCompletions} tarefas concluídas · ${program.dailyRecords} registros diários`
}

export function AdministrationInsightsPanel({ administration }) {
  const insights = useAdministrationInsights(administration)
  const summary = insights.report?.summary
  return <section className="admin-panel admin-insights"><header><div><span>Adesão objetiva e rastreabilidade</span><h2>Reporting e auditoria</h2></div><select aria-label="Escopo dos indicadores" value={insights.scope} onChange={(event) => insights.setScope(event.target.value)}>{administration.canManageTeams && <option value="tenant">Toda a organização</option>}{insights.availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></header>
    {insights.status === 'loading' && <div className="admin-state" role="status">Carregando indicadores objetivos…</div>}
    {insights.status === 'empty' && <p className="admin-empty">Nenhum time gerenciado disponível para esta leitura.</p>}
    {insights.status === 'error' && <div className="admin-state error" role="alert"><strong>Não foi possível carregar reporting e auditoria.</strong><span>{insights.error?.message}</span><button className="button" type="button" onClick={() => insights.reload().catch(() => {})}>Tentar novamente</button></div>}
    {insights.status === 'ready' && <><div className="admin-metrics"><article><span>{insights.scope === 'tenant' ? 'Membros ativos' : 'Membros'}</span><strong>{summary.activeMembers ?? summary.members}</strong></article><article><span>Ciclos ativos</span><strong>{summary.activeEnrollments}</strong></article><article><span>Atividades</span><strong>{summary.activityCompletions}</strong></article><article><span>Registros diários</span><strong>{summary.dailyRecords}</strong></article></div>
      {insights.report.members && <div className="admin-report-members"><h3>Adesão nominal objetiva</h3>{insights.report.members.map((member) => <article key={member.membershipId}><div><strong>{member.email}</strong><span>{member.role}</span></div><small>{member.activeEnrollments} ativos · {member.activityCompletions} atividades · {member.dailyRecords} dias</small></article>)}</div>}
      {insights.report.programs && <div className="admin-report-members"><h3>Programas</h3>{insights.report.programs.map((program) => <article key={`${program.programId}-${program.programVersionId}`}><div><strong>{program.title ?? 'Versão ainda não iniciada'}</strong><span>{program.enrollments} adesões</span></div><small>{programSummary(program)}</small></article>)}</div>}
      <div className="admin-audit"><h3>Atividades recentes <small>{insights.audit.total} registradas</small></h3>{insights.audit.items.length ? insights.audit.items.map((event) => <article key={event.id}><div><strong>{actionLabels[event.action] ?? event.action}</strong><span>{entityTypeLabels[event.entityType] ?? event.entityType}</span></div><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('pt-BR')}</time></article>) : <p className="admin-empty">Nenhuma atividade registrada.</p>}</div></>}
  </section>
}
