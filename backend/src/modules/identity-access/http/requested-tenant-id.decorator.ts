import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const RequestedTenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const value = context.switchToHttp().getRequest<Request>().headers['x-tenant-id']
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException({ code: 'INVALID_TENANT_HEADER', message: 'X-Tenant-Id inválido' })
  }
  return value.toLowerCase()
})
