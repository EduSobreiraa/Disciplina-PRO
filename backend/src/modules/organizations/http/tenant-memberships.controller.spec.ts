import { jest } from '@jest/globals'
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { CurrentTenantContext } from '../application/organization-context.repository.js'
import { AssignTeamMembershipUseCase, ChangeMembershipRoleUseCase, EndTeamMembershipUseCase, InactivateMembershipUseCase, ListMembershipsUseCase, ReactivateMembershipUseCase, SuspendMembershipUseCase } from '../application/membership-administration.use-cases.js'
import { InvalidMembershipTransitionError, InvalidTeamMembershipAssignmentError, InvalidTenantDataError, MembershipNotFoundError, ResourceScopeDeniedError, TenantActorInactiveError } from '../domain/organization.errors.js'
import { TenantMembershipsController } from './tenant-memberships.controller.js'

const context: CurrentTenantContext = {
  tenantId: '019f854f-58c7-7d1c-85ec-b855ee159027',
  membershipId: '019f854f-58c7-7d1c-85ec-b855ee159028',
  userId: '019f854f-58c7-7d1c-85ec-b855ee159029',
  tenantRole: 'CEO',
}
const targetId = '019f854f-58c7-7d1c-85ec-b855ee159030'
const teamId = '019f854f-58c7-7d1c-85ec-b855ee159031'

describe('TenantMembershipsController', () => {
  const listExecute = jest.fn<ListMembershipsUseCase['execute']>().mockResolvedValue([])
  const assignExecute = jest.fn<AssignTeamMembershipUseCase['execute']>().mockResolvedValue({})
  const endExecute = jest.fn<EndTeamMembershipUseCase['execute']>().mockResolvedValue({})
  const suspendExecute = jest.fn<SuspendMembershipUseCase['execute']>().mockResolvedValue({} as never)
  const inactivateExecute = jest.fn<InactivateMembershipUseCase['execute']>().mockResolvedValue({} as never)
  const reactivateExecute = jest.fn<ReactivateMembershipUseCase['execute']>().mockResolvedValue({} as never)
  const roleExecute = jest.fn<ChangeMembershipRoleUseCase['execute']>().mockResolvedValue({} as never)
  const controller = new TenantMembershipsController(
    { execute: listExecute } as unknown as ListMembershipsUseCase,
    { execute: assignExecute } as unknown as AssignTeamMembershipUseCase,
    { execute: endExecute } as unknown as EndTeamMembershipUseCase,
    { execute: suspendExecute } as unknown as SuspendMembershipUseCase,
    { execute: inactivateExecute } as unknown as InactivateMembershipUseCase,
    { execute: reactivateExecute } as unknown as ReactivateMembershipUseCase,
    { execute: roleExecute } as unknown as ChangeMembershipRoleUseCase,
  )

  beforeEach(() => jest.clearAllMocks())

  it('encaminha todas as operações HTTP aos casos de uso', async () => {
    await controller.list(context)
    await controller.assign(context, teamId, { membershipId: targetId, role: 'MEMBER' })
    await controller.end(context, teamId, targetId)
    await controller.suspend(context, targetId, { reason: 'Motivo válido' })
    await controller.inactivate(context, targetId, { reason: 'Motivo válido' })
    await controller.reactivate(context, targetId, { reason: 'Motivo válido' })
    await controller.role(context, targetId, { role: 'MANAGER' })
    expect(listExecute).toHaveBeenCalledWith(context)
    expect(assignExecute).toHaveBeenCalledWith(context, { teamId, membershipId: targetId, role: 'MEMBER' })
    expect(endExecute).toHaveBeenCalledWith(context, { teamId, membershipId: targetId })
    expect(roleExecute).toHaveBeenCalledWith(context, targetId, 'MANAGER')
  })

  it.each([
    [new InvalidTenantDataError(), BadRequestException],
    [new MembershipNotFoundError(), NotFoundException],
    [new InvalidMembershipTransitionError(), ConflictException],
    [new InvalidTeamMembershipAssignmentError(), ConflictException],
    [new ResourceScopeDeniedError(), ForbiddenException],
    [new TenantActorInactiveError(), ForbiddenException],
  ] as const)('traduz erro de domínio %# para o contrato HTTP', async (error, HttpError) => {
    listExecute.mockRejectedValueOnce(error)
    await expect(controller.list(context)).rejects.toBeInstanceOf(HttpError)
  })
})
