import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { parseTenantHeader } from './tenant-header.js'

export const RequestedTenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  return parseTenantHeader(context.switchToHttp().getRequest<Request>().headers['x-tenant-id'], false)
})
