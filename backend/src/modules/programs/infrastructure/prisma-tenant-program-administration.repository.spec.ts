import { jest } from '@jest/globals'
import type { PrismaService } from '../../../database/prisma.service.js'
import { PlatformProgramActorInactiveError, ProgramEnablementNotAllowedError } from '../domain/program.errors.js'
import { PrismaTenantProgramAdministrationRepository } from './prisma-tenant-program-administration.repository.js'
import type { ProgramAvailabilityProvisioner } from '../application/program-availability.provisioner.js'

const input = {
  actorPlatformAccessId: '019f854f-58c7-7d1c-85ec-b855ee159001',
  tenantId: '019f854f-58c7-7d1c-85ec-b855ee159002',
  programId: '019f854f-58c7-7d1c-85ec-b855ee159003',
  now: new Date('2026-07-25T19:00:00.000Z'),
}

function setup() {
  const relation = {
    id: '019f854f-58c7-7d1c-85ec-b855ee159004',
    tenantId: input.tenantId,
    programId: input.programId,
    status: 'ENABLED' as const,
    enabledAt: input.now,
    disabledAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  }
  const tx = {
    $queryRaw: jest.fn<() => Promise<Array<{ id: string }>>>().mockResolvedValue([{ id: input.actorPlatformAccessId }]),
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValueOnce(0).mockResolvedValueOnce(2),
    tenant: { findUnique: jest.fn<() => Promise<{ status: string } | null>>().mockResolvedValue({ status: 'ACTIVE' }) },
    program: { findUnique: jest.fn<() => Promise<{ status: string } | null>>().mockResolvedValue({ status: 'ACTIVE' }) },
    programVersion: { count: jest.fn<() => Promise<number>>().mockResolvedValue(1) },
    tenantProgram: {
      findUnique: jest.fn<() => Promise<typeof relation | (Omit<typeof relation, 'status' | 'disabledAt'> & { status: 'DISABLED'; disabledAt: Date }) | null>>().mockResolvedValue(null),
      create: jest.fn<() => Promise<typeof relation>>().mockResolvedValue(relation),
      update: jest.fn<() => Promise<typeof relation | (Omit<typeof relation, 'status' | 'disabledAt'> & { status: 'DISABLED'; disabledAt: Date })>>().mockResolvedValue(relation),
    },
    auditEvent: { create: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'audit-id' }) },
  }
  const prisma = {
    $transaction: jest.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  }
  const availability = {
    provisionTenant: jest.fn<ProgramAvailabilityProvisioner['provisionTenant']>().mockResolvedValue(2),
    provisionMembership: jest.fn<ProgramAvailabilityProvisioner['provisionMembership']>().mockResolvedValue(0),
  }
  return {
    relation,
    tx,
    availability,
    repository: new PrismaTenantProgramAdministrationRepository(
      prisma as unknown as PrismaService,
      availability,
    ),
  }
}

describe('PrismaTenantProgramAdministrationRepository', () => {
  it('habilita, provisiona matrículas e audita uma nova relação', async () => {
    const { relation, tx, repository } = setup()

    await expect(repository.enable(input)).resolves.toEqual({ ...relation, provisionedEnrollments: 2 })
    expect(tx.tenantProgram.create).toHaveBeenCalled()
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1)
  })

  it('repara matrículas sem repetir auditoria quando já está habilitado', async () => {
    const { relation, tx, repository } = setup()
    tx.tenantProgram.findUnique.mockResolvedValue(relation)

    await expect(repository.enable(input)).resolves.toEqual({ ...relation, provisionedEnrollments: 2 })
    expect(tx.tenantProgram.update).toHaveBeenCalledTimes(1)
    expect(tx.auditEvent.create).not.toHaveBeenCalled()
  })

  it('recusa habilitação quando tenant, programa ou publicação não estão aptos', async () => {
    const { tx, repository } = setup()
    tx.programVersion.count.mockResolvedValue(0)

    await expect(repository.enable(input)).rejects.toBeInstanceOf(ProgramEnablementNotAllowedError)
    expect(tx.tenantProgram.create).not.toHaveBeenCalled()
  })

  it('recusa operações de ator de plataforma inativo', async () => {
    const { tx, repository } = setup()
    tx.$queryRaw.mockResolvedValue([])

    await expect(repository.enable(input)).rejects.toBeInstanceOf(PlatformProgramActorInactiveError)
  })

  it('desabilita e audita preservando as matrículas', async () => {
    const { relation, tx, repository } = setup()
    tx.tenantProgram.findUnique.mockResolvedValue(relation)
    const disabled = { ...relation, status: 'DISABLED' as const, disabledAt: input.now }
    tx.tenantProgram.update.mockResolvedValue(disabled)

    await expect(repository.disable(input)).resolves.toEqual({ ...disabled, provisionedEnrollments: 0 })
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1)
  })

  it('é idempotente ao desabilitar e recusa relação inexistente', async () => {
    const first = setup()
    first.tx.tenantProgram.findUnique.mockResolvedValue({ ...first.relation, status: 'DISABLED', disabledAt: input.now })
    await expect(first.repository.disable(input)).resolves.toEqual(expect.objectContaining({
      status: 'DISABLED',
      provisionedEnrollments: 0,
    }))
    expect(first.tx.tenantProgram.update).not.toHaveBeenCalled()

    const second = setup()
    await expect(second.repository.disable(input)).rejects.toBeInstanceOf(ProgramEnablementNotAllowedError)
  })
})
