import { jest } from '@jest/globals'
import type { CurrentTenantContext } from './organization-context.repository.js'
import { ArchiveTeamUseCase, CreateTeamUseCase, ListTeamsUseCase, RestoreTeamUseCase, UpdateTeamUseCase } from './team-administration.use-cases.js'
import type { TeamAdministrationRepository, TeamView } from './team-administration.repository.js'

const context: CurrentTenantContext = {
  tenantId: '019f854f-58c7-7d1c-85ec-b855ee159027',
  membershipId: '019f854f-58c7-7d1c-85ec-b855ee159028',
  userId: '019f854f-58c7-7d1c-85ec-b855ee159029',
  tenantRole: 'CEO',
}
const team: TeamView = {
  id: '019f854f-58c7-7d1c-85ec-b855ee159030',
  tenantId: context.tenantId,
  name: 'Operações',
  normalizedName: 'operações',
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
}

describe('casos de uso de administração de times', () => {
  const listCurrent = jest.fn<TeamAdministrationRepository['listCurrent']>().mockResolvedValue([team])
  const create = jest.fn<TeamAdministrationRepository['create']>().mockResolvedValue(team)
  const update = jest.fn<TeamAdministrationRepository['update']>().mockResolvedValue(team)
  const archive = jest.fn<TeamAdministrationRepository['archive']>().mockResolvedValue(team)
  const restore = jest.fn<TeamAdministrationRepository['restore']>().mockResolvedValue(team)
  const repository = { listCurrent, create, update, archive, restore } as jest.Mocked<TeamAdministrationRepository>

  beforeEach(() => jest.clearAllMocks())

  it('lista pelo tenant e ator do contexto confiável', async () => {
    await new ListTeamsUseCase(repository).execute(context)
    expect(listCurrent).toHaveBeenCalledWith({ tenantId: context.tenantId, actorMembershipId: context.membershipId })
  })

  it('normaliza o nome antes da criação', async () => {
    await new CreateTeamUseCase(repository).execute(context, { name: '  Operações   Norte ' })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: context.tenantId,
      actorMembershipId: context.membershipId,
      name: 'Operações Norte',
      normalizedName: 'operações norte',
      now: expect.any(Date) as Date,
    }))
  })

  it('valida o id e normaliza o nome antes da alteração', async () => {
    await new UpdateTeamUseCase(repository).execute(context, { teamId: team.id, name: '  Novo   Nome ' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ teamId: team.id, name: 'Novo Nome', normalizedName: 'novo nome' }))
  })

  it.each([
    ['arquivamento', ArchiveTeamUseCase, archive],
    ['restauração', RestoreTeamUseCase, restore],
  ] as const)('encaminha o %s com escopo explícito', async (_name, UseCase, operation) => {
    await new UseCase(repository).execute(context, team.id)
    expect(operation).toHaveBeenCalledWith({
      tenantId: context.tenantId,
      actorMembershipId: context.membershipId,
      teamId: team.id,
      now: expect.any(Date) as Date,
    })
  })
})
