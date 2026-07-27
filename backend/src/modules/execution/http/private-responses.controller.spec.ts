import { jest } from '@jest/globals'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import type { GetPrivateResponseUseCase, PutPrivateResponseUseCase } from '../application/execution-facts.use-cases.js'
import { PrivateResponseNotFoundError } from '../domain/execution.errors.js'
import { PrivateResponsesController } from './private-responses.controller.js'

describe('PrivateResponsesController', () => {
  const context: CurrentTenantContext = { tenantId: 'tenant', membershipId: 'membership', userId: 'user', tenantRole: 'USER' }

  it('delegates writes and maps missing reads without inspecting payload', async () => {
    const put = { execute: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'response' }) }
    const get = { execute: jest.fn<() => Promise<unknown>>().mockRejectedValue(new PrivateResponseNotFoundError()) }
    const controller = new PrivateResponsesController(
      put as unknown as PutPrivateResponseUseCase,
      get as unknown as GetPrivateResponseUseCase,
    )
    await expect(controller.put(context, 'enrollment', 'activity', { payload: { private: 'value' } })).resolves.toEqual({ id: 'response' })
    await expect(controller.get(context, 'enrollment', 'activity')).rejects.toMatchObject({ response: { code: 'RESOURCE_NOT_FOUND' } })
  })
})
