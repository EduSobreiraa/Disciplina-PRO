import { NotFoundException } from '@nestjs/common'
import { jest } from '@jest/globals'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { PersonalReport, TeamReport } from '../application/reporting.repository.js'
import type { GetInactiveMembersReportUseCase, GetPersonalReportUseCase, GetTeamReportUseCase, GetTenantReportUseCase } from '../application/reporting.use-cases.js'
import { ReportingController } from './reporting.controller.js'

const context: CurrentTenantContext = {
  userId: '01900000-0000-7000-8000-000000000001',
  tenantId: '01900000-0000-7000-8000-000000000002',
  membershipId: '01900000-0000-7000-8000-000000000003',
  tenantRole: 'MANAGER',
}
const teamId = '01900000-0000-7000-8000-000000000004'

describe('ReportingController', () => {
  it('returns personal and team projections from their use cases', async () => {
    const personal = {
      membershipId: context.membershipId,
      summary: { enrollments: 0, activeEnrollments: 0, completedEnrollments: 0, activityCompletions: 0, dailyRecords: 0 },
      programs: [],
    } satisfies PersonalReport
    const team = {
      teamId,
      name: 'Time',
      summary: { members: 0, enrollments: 0, activeEnrollments: 0, completedEnrollments: 0, activityCompletions: 0, dailyRecords: 0 },
      members: [],
    } satisfies TeamReport
    const personalExecute = jest.fn<GetPersonalReportUseCase['execute']>().mockResolvedValue(personal)
    const teamExecute = jest.fn<GetTeamReportUseCase['execute']>().mockResolvedValue(team)
    const tenantExecute = jest.fn<GetTenantReportUseCase['execute']>().mockResolvedValue({
      tenantId: context.tenantId,
      summary: { activeMembers: 0, enrollments: 0, activeEnrollments: 0, completedEnrollments: 0, activityCompletions: 0, dailyRecords: 0 },
      programs: [],
    })
    const inactiveExecute = jest.fn<GetInactiveMembersReportUseCase['execute']>().mockResolvedValue({
      inactiveSince: new Date('2026-08-01T00:00:00.000Z'),
      total: 0,
      members: [],
    })
    const controller = new ReportingController(
      { execute: personalExecute } as unknown as GetPersonalReportUseCase,
      { execute: teamExecute } as unknown as GetTeamReportUseCase,
      { execute: tenantExecute } as unknown as GetTenantReportUseCase,
      { execute: inactiveExecute } as unknown as GetInactiveMembersReportUseCase,
    )

    await expect(controller.mine(context)).resolves.toBe(personal)
    await expect(controller.team(context, teamId)).resolves.toBe(team)
    expect(personalExecute).toHaveBeenCalledWith(context)
    expect(teamExecute).toHaveBeenCalledWith(context, teamId)
    await expect(controller.tenant(context)).resolves.toMatchObject({ tenantId: context.tenantId })
    await expect(controller.inactiveMembers(context, { inactiveSince: '2026-08-01T00:00:00.000Z' }))
      .resolves.toMatchObject({ total: 0 })
    expect(tenantExecute).toHaveBeenCalledWith(context)
    expect(inactiveExecute).toHaveBeenCalledWith(context, new Date('2026-08-01T00:00:00.000Z'))
  })

  it('uses the same not-found response for an absent or unauthorized team', async () => {
    const controller = new ReportingController(
      { execute: jest.fn<GetPersonalReportUseCase['execute']>() } as unknown as GetPersonalReportUseCase,
      { execute: jest.fn<GetTeamReportUseCase['execute']>().mockResolvedValue(null) } as unknown as GetTeamReportUseCase,
      { execute: jest.fn<GetTenantReportUseCase['execute']>() } as unknown as GetTenantReportUseCase,
      { execute: jest.fn<GetInactiveMembersReportUseCase['execute']>() } as unknown as GetInactiveMembersReportUseCase,
    )

    await expect(controller.team(context, teamId)).rejects.toBeInstanceOf(NotFoundException)
  })
})
