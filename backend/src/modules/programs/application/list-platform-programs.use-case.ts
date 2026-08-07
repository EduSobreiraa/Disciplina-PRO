import { Injectable } from '@nestjs/common'
import type { CurrentPlatformContext } from '../../organizations/application/organization-context.repository.js'
import { ProgramAdministrationRepository } from './program-administration.repository.js'

@Injectable()
export class ListPlatformProgramsUseCase {
  constructor(private readonly programs: ProgramAdministrationRepository) {}

  execute(context: CurrentPlatformContext) {
    void context
    return this.programs.list()
  }
}
