import { Controller, Get, NotFoundException } from '@nestjs/common'
import { Public } from '../modules/identity-access/http/public.decorator.js'

@Public()
@Controller()
export class DebugSentryController {
  @Get('debug-sentry')
  getError(): never {
    if (process.env.SENTRY_ENVIRONMENT !== 'lab') throw new NotFoundException()
    throw new Error('My first Sentry error!')
  }
}
