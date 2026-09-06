import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common'
import { ExistingAccountAuthenticationRequiredError, FirstCeoInvitationUnavailableError, InvalidInvitationDataError, InvitationActorInactiveError, InvitationAlreadyPendingError, InvitationInvalidError, InvitationNotFoundError, InvitationNotPendingError, InvitationResourceScopeDeniedError, MembershipAlreadyExistsError } from '../domain/invitation.errors.js'
import { WeakPasswordError } from '../../identity-access/domain/identity.errors.js'

interface InvitationErrorMapping {
  matches(error: unknown): boolean
  toHttpException(error: unknown): HttpException
}

const INVITATION_ERROR_MAPPINGS: InvitationErrorMapping[] = [
  {
    matches: (error) => error instanceof InvalidInvitationDataError || error instanceof WeakPasswordError,
    toHttpException: (error) => new BadRequestException({ code: 'INVALID_INVITATION_DATA', message: (error as Error).message }),
  },
  { matches: (error) => error instanceof InvitationInvalidError, toHttpException: () => new BadRequestException({ code: 'INVITATION_INVALID', message: 'Convite inválido' }) },
  { matches: (error) => error instanceof ExistingAccountAuthenticationRequiredError, toHttpException: () => new ConflictException({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED', message: 'Autenticação da conta existente é necessária' }) },
  { matches: (error) => error instanceof InvitationAlreadyPendingError, toHttpException: () => new ConflictException({ code: 'INVITATION_ALREADY_PENDING', message: 'Já existe convite pendente para este e-mail' }) },
  { matches: (error) => error instanceof MembershipAlreadyExistsError, toHttpException: () => new ConflictException({ code: 'MEMBERSHIP_ALREADY_EXISTS', message: 'Já existe membership para este e-mail' }) },
  { matches: (error) => error instanceof InvitationNotFoundError, toHttpException: () => new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' }) },
  { matches: (error) => error instanceof InvitationNotPendingError, toHttpException: () => new ConflictException({ code: 'INVALID_INVITATION_TRANSITION', message: 'Convite não está pendente' }) },
  { matches: (error) => error instanceof InvitationResourceScopeDeniedError, toHttpException: () => new ForbiddenException({ code: 'RESOURCE_SCOPE_DENIED', message: 'Recurso fora do escopo permitido' }) },
  { matches: (error) => error instanceof InvitationActorInactiveError, toHttpException: () => new ForbiddenException({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso negado' }) },
  { matches: (error) => error instanceof FirstCeoInvitationUnavailableError, toHttpException: () => new ConflictException({ code: 'FIRST_CEO_INVITATION_UNAVAILABLE', message: 'Primeiro CEO não pode ser convidado neste estado' }) },
]

function invitationHttpException(error: unknown) {
  return INVITATION_ERROR_MAPPINGS.find((mapping) => mapping.matches(error))?.toHttpException(error)
}

export async function mapInvitationErrors<T>(operation: () => Promise<T>) {
  try { return await operation() } catch (error) {
    const httpException = invitationHttpException(error)
    if (httpException) throw httpException
    throw error
  }
}
