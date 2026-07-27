import { BadRequestException } from '@nestjs/common'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function parseTenantHeader(value: string | string[] | undefined, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) throw new BadRequestException({ code: 'TENANT_CONTEXT_REQUIRED', message: 'Contexto de tenant necessário' })
    return undefined
  }
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException({ code: 'INVALID_TENANT_HEADER', message: 'X-Tenant-Id inválido' })
  }
  return value.toLowerCase()
}
