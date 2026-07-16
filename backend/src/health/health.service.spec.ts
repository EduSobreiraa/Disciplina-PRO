import { jest } from '@jest/globals'
import { HealthService } from './health.service.js'

describe('HealthService', () => {
  const database = { checkConnection: jest.fn<() => Promise<Date>>() }
  const service = new HealthService(database as never)

  it('returns the API health status', () => {
    expect(service.getHealth()).toEqual({ status: 'ok', service: 'disciplina-pro-api' })
  })

  it('returns readiness after checking the database', async () => {
    const checkedAt = new Date('2026-07-15T12:00:00.000Z')
    database.checkConnection.mockResolvedValueOnce(checkedAt)
    await expect(service.getReadiness()).resolves.toEqual({ status: 'ready', service: 'disciplina-pro-api', database: 'up', checkedAt })
  })
})
