import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ExistingAccountAuthenticationRequiredError, FirstCeoInvitationUnavailableError, InvalidInvitationDataError, InvitationActorInactiveError, InvitationAlreadyPendingError, InvitationInvalidError, InvitationNotFoundError, InvitationNotPendingError, InvitationResourceScopeDeniedError, MembershipAlreadyExistsError } from '../domain/invitation.errors.js'
import { WeakPasswordError } from '../../identity-access/domain/identity.errors.js'

export async function mapInvitationErrors<T>(operation: () => Promise<T>) {
  try { return await operation() } catch (error) {
    if (error instanceof InvalidInvitationDataError || error instanceof WeakPasswordError) throw new BadRequestException({ code: 'INVALID_INVITATION_DATA', message: error.message })
    if (error instanceof InvitationInvalidError) throw new BadRequestException({ code: 'INVITATION_INVALID', message: 'Convite inválido' })
    if (error instanceof ExistingAccountAuthenticationRequiredError) throw new ConflictException({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED', message: 'Autenticação da conta existente é necessária' })
    if (error instanceof InvitationAlreadyPendingError) throw new ConflictException({ code: 'INVITATION_ALREADY_PENDING', message: 'Já existe convite pendente para este e-mail' })
    if (error instanceof MembershipAlreadyExistsError) throw new ConflictException({ code: 'MEMBERSHIP_ALREADY_EXISTS', message: 'Já existe membership para este e-mail' })
    if (error instanceof InvitationNotFoundError) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' })
    if (error instanceof InvitationNotPendingError) throw new ConflictException({ code: 'INVALID_INVITATION_TRANSITION', message: 'Convite não está pendente' })
    if (error instanceof InvitationResourceScopeDeniedError) throw new ForbiddenException({ code: 'RESOURCE_SCOPE_DENIED', message: 'Recurso fora do escopo permitido' })
    if (error instanceof InvitationActorInactiveError) throw new ForbiddenException({ code: 'TENANT_ACCESS_DENIED', message: 'Acesso negado' })
    if (error instanceof FirstCeoInvitationUnavailableError) throw new ConflictException({ code: 'FIRST_CEO_INVITATION_UNAVAILABLE', message: 'Primeiro CEO não pode ser convidado neste estado' })
    throw error
  }
}
