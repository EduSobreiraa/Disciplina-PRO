import { Injectable } from '@nestjs/common'
import type { CurrentTenantContext } from '../../organizations/application/organization-context.repository.js'
import { EnrollmentNotFoundError, ExecutionBlockedError, InvalidExecutionDataError } from '../domain/execution.errors.js'
import { ExecutionLifecycleRepository, ExecutionQueryRepository } from './execution.repository.js'

@Injectable()
export class ListEnrollmentsUseCase {
  constructor(private readonly queries: ExecutionQueryRepository) {}
  execute(context: CurrentTenantContext, now = new Date()) { return this.queries.list(context, now) }
}

@Injectable()
export class GetEnrollmentUseCase {
  constructor(private readonly queries: ExecutionQueryRepository) {}
  async execute(context: CurrentTenantContext, enrollmentId: string, now = new Date()) {
    const enrollment = await this.queries.find(context, enrollmentId, now)
    if (!enrollment) throw new EnrollmentNotFoundError()
    return enrollment
  }
}

@Injectable()
export class StartEnrollmentUseCase {
  constructor(private readonly lifecycle: ExecutionLifecycleRepository) {}
  execute(context: CurrentTenantContext, enrollmentId: string, now = new Date()) {
    return this.lifecycle.start(context, enrollmentId, now)
  }
}

@Injectable()
export class CompleteEnrollmentUseCase {
  constructor(private readonly lifecycle: ExecutionLifecycleRepository) {}
  execute(context: CurrentTenantContext, enrollmentId: string, now = new Date()) {
    return this.lifecycle.complete(context, enrollmentId, now)
  }
}

@Injectable()
export class AbandonEnrollmentUseCase {
  constructor(private readonly lifecycle: ExecutionLifecycleRepository) {}
  execute(context: CurrentTenantContext, enrollmentId: string, reason: string, now = new Date()) {
    const normalizedReason = reason.trim()
    if (!normalizedReason || normalizedReason.length > 500) throw new InvalidExecutionDataError()
    return this.lifecycle.abandon(context, enrollmentId, normalizedReason, now)
  }
}

@Injectable()
export class PauseEnrollmentUseCase {
  constructor(private readonly lifecycle: ExecutionLifecycleRepository) {}
  execute(context: CurrentTenantContext, enrollmentId: string, reason: string, now = new Date()) {
    const normalizedReason = reason.trim()
    if (!normalizedReason || normalizedReason.length > 500) throw new InvalidExecutionDataError()
    return this.lifecycle.pause(context, enrollmentId, normalizedReason, now)
  }
}

@Injectable()
export class ResumeEnrollmentUseCase {
  constructor(private readonly lifecycle: ExecutionLifecycleRepository) {}
  async execute(context: CurrentTenantContext, enrollmentId: string, now = new Date()) {
    const result = await this.lifecycle.resume(context, enrollmentId, now)
    if (result.blocked) throw new ExecutionBlockedError()
    return result.enrollment
  }
}
