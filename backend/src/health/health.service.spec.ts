import { HealthService } from './health.service.js'

describe('HealthService', () => {
  it('returns the API health status', () => {
    expect(new HealthService().getHealth()).toEqual({ status: 'ok', service: 'disciplina-pro-api' })
  })
})
