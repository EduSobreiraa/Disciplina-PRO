import { jest } from '@jest/globals'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { AuditQueryRepository, type AuditPage } from './audit.repository.js'
import { GetMyAuditUseCase, GetTeamAuditUseCase, GetTenantAuditUseCase } from './audit.use-cases.js'

const context: CurrentTenantContext = {
  tenantId: 'tenant-id',
  membershipId: 'membership-id',
  userId: 'user-id',
  tenantRole: 'CEO',
}
const pagination = { page: 2, limit: 25 }
const page: AuditPage = { items: [], page: 2, limit: 25, total: 0 }

describe('Audit query use cases', () => {
  it('delegates personal, team and tenant scopes without changing pagination or context', async () => {
    const findMine = jest.fn<AuditQueryRepository['findMine']>().mockResolvedValue(page)
    const findTeam = jest.fn<AuditQueryRepository['findTeam']>().mockResolvedValue(page)
    const findTenant = jest.fn<AuditQueryRepository['findTenant']>().mockResolvedValue(page)
    const repository = {
      findMine,
      findTeam,
      findTenant,
    } as unknown as AuditQueryRepository

    await expect(new GetMyAuditUseCase(repository).execute(context, pagination)).resolves.toBe(page)
    await expect(new GetTeamAuditUseCase(repository).execute(context, 'team-id', pagination)).resolves.toBe(page)
    await expect(new GetTenantAuditUseCase(repository).execute(context, pagination)).resolves.toBe(page)

    expect(findMine).toHaveBeenCalledWith(context, pagination)
    expect(findTeam).toHaveBeenCalledWith(context, 'team-id', pagination)
    expect(findTenant).toHaveBeenCalledWith(context, pagination)
  })
})
