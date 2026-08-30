import { Controller, Get, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Environment } from '../config/environment.js'
import { Public } from '../modules/identity-access/http/public.decorator.js'

@Public()
@Controller()
export class DebugSentryController {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  @Get('debug-sentry')
  getError(): never {
    if (this.config.get('DEPLOYMENT_STAGE', { infer: true }) !== 'lab') throw new NotFoundException()
    throw new Error('My first Sentry error!')
  }
}
