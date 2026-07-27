import { Injectable } from '@nestjs/common'
import { SessionContextRepository } from './session-context.repository.js'

@Injectable()
export class GetSessionContextUseCase {
  constructor(private readonly contexts: SessionContextRepository) {}

  execute(userId: string) {
    return this.contexts.findByUserId(userId)
  }
}
