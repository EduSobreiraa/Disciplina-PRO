import { jest } from '@jest/globals'
import type { CurrentPlatformContext, CurrentTenantContext } from './organization-context.repository.js'
import { AssignTeamMembershipUseCase, ChangeMembershipRoleUseCase, EndTeamMembershipUseCase, InactivateMembershipUseCase, ListMembershipsUseCase, ReactivateMembershipUseCase, ReplaceCeoUseCase, SuspendMembershipUseCase } from './membership-administration.use-cases.js'
import type { CeoReplacementRepository, MembershipAdministrationRepository, MembershipView } from './membership-administration.repository.js'

const tenantContext: CurrentTenantContext = {
  tenantId: '019f854f-58c7-7d1c-85ec-b855ee159027',
  membershipId: '019f854f-58c7-7d1c-85ec-b855ee159028',
  userId: '019f854f-58c7-7d1c-85ec-b855ee159029',
  tenantRole: 'CEO',
}
const targetId = '019f854f-58c7-7d1c-85ec-b855ee159030'
const teamId = '019f854f-58c7-7d1c-85ec-b855ee159031'
const view: MembershipView = {
  id: targetId, tenantId: tenantContext.tenantId, userId: tenantContext.userId,
  role: 'USER', status: 'ACTIVE', suspendedAt: null, deactivatedAt: null, user: { email: 'user@example.test' }, teams: [],
}

describe('casos de uso de memberships', () => {
  const listScoped = jest.fn<MembershipAdministrationRepository['listScoped']>().mockResolvedValue([view])
  const assignTeam = jest.fn<MembershipAdministrationRepository['assignTeam']>().mockResolvedValue({})
  const endTeamAssignment = jest.fn<MembershipAdministrationRepository['endTeamAssignment']>().mockResolvedValue({})
  const suspend = jest.fn<MembershipAdministrationRepository['suspend']>().mockResolvedValue(view)
  const inactivate = jest.fn<MembershipAdministrationRepository['inactivate']>().mockResolvedValue(view)
  const reactivate = jest.fn<MembershipAdministrationRepository['reactivate']>().mockResolvedValue(view)
  const changeRole = jest.fn<MembershipAdministrationRepository['changeRole']>().mockResolvedValue(view)
  const memberships = { listScoped, assignTeam, endTeamAssignment, suspend, inactivate, reactivate, changeRole } as jest.Mocked<MembershipAdministrationRepository>
  const replace = jest.fn<CeoReplacementRepository['replace']>().mockResolvedValue(view)
  const replacements = { replace } as jest.Mocked<CeoReplacementRepository>

  beforeEach(() => jest.clearAllMocks())

  it('encaminha listagem e vínculos com escopo explícito', async () => {
    await new ListMembershipsUseCase(memberships).execute(tenantContext)
    await new AssignTeamMembershipUseCase(memberships).execute(tenantContext, { teamId, membershipId: targetId, role: 'MEMBER' })
    await new EndTeamMembershipUseCase(memberships).execute(tenantContext, { teamId, membershipId: targetId })
    expect(listScoped).toHaveBeenCalledWith(tenantContext)
    expect(assignTeam).toHaveBeenCalledWith(expect.objectContaining({ tenantId: tenantContext.tenantId, actorMembershipId: tenantContext.membershipId, teamId, targetMembershipId: targetId, role: 'MEMBER' }))
    expect(endTeamAssignment).toHaveBeenCalledWith(expect.objectContaining({ teamId, targetMembershipId: targetId }))
  })

  it.each([
    ['suspende', SuspendMembershipUseCase, suspend],
    ['inativa', InactivateMembershipUseCase, inactivate],
    ['reativa', ReactivateMembershipUseCase, reactivate],
  ] as const)('%s com motivo normalizado', async (_name, UseCase, operation) => {
    await new UseCase(memberships).execute(tenantContext, targetId, '  Motivo   operacional ')
    expect(operation).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenantContext.tenantId, actorMembershipId: tenantContext.membershipId,
      targetMembershipId: targetId, reason: 'Motivo operacional', now: expect.any(Date) as Date,
    }))
  })

  it('encaminha alteração de role sem permitir CEO no contrato', async () => {
    await new ChangeMembershipRoleUseCase(memberships).execute(tenantContext, targetId, 'MANAGER')
    expect(changeRole).toHaveBeenCalledWith(expect.objectContaining({ targetMembershipId: targetId, role: 'MANAGER' }))
  })

  it('valida todos os identificadores da substituição de CEO', async () => {
    const platform: CurrentPlatformContext = {
      platformAccessId: '019f854f-58c7-7d1c-85ec-b855ee159032',
      userId: tenantContext.userId,
      platformRole: 'SUPER_ADMIN',
    }
    await new ReplaceCeoUseCase(replacements).execute(platform, {
      tenantId: tenantContext.tenantId,
      expectedCeoMembershipId: tenantContext.membershipId,
      successorMembershipId: targetId,
      reason: '  Troca   aprovada ',
    })
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenantContext.tenantId, expectedCeoMembershipId: tenantContext.membershipId,
      successorMembershipId: targetId, actorPlatformAccessId: platform.platformAccessId, reason: 'Troca aprovada',
    }))
  })
})
