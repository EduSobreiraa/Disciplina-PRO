import { normalizeEmail } from '../../identity-access/domain/identity-policy.js'
import { InvalidInvitationDataError } from './invitation.errors.js'

export type InvitationTenantRole = 'USER' | 'MANAGER'
export type InvitationTeamRole = 'MEMBER' | 'MANAGER'

export interface InvitationTeamInput {
  teamId: string
  role: InvitationTeamRole
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function normalizeInvitationEmail(email: string) {
  try {
    return { email: email.trim().normalize('NFC'), normalizedEmail: normalizeEmail(email) }
  } catch {
    throw new InvalidInvitationDataError('E-mail inválido')
  }
}

export function validateInvitationId(id: string) {
  if (!UUID_PATTERN.test(id)) throw new InvalidInvitationDataError('Identificador de convite inválido')
  return id
}

export function validateTenantInvitation(input: { role: string; teams?: InvitationTeamInput[] }) {
  if (!['USER', 'MANAGER'].includes(input.role)) throw new InvalidInvitationDataError('Role de convite inválida')
  const teams = input.teams ?? []
  const ids = new Set<string>()
  for (const team of teams) {
    if (!UUID_PATTERN.test(team.teamId) || !['MEMBER', 'MANAGER'].includes(team.role) || ids.has(team.teamId)) {
      throw new InvalidInvitationDataError('Times do convite inválidos')
    }
    if (team.role === 'MANAGER' && input.role !== 'MANAGER') throw new InvalidInvitationDataError('Somente Manager pode administrar time')
    ids.add(team.teamId)
  }
  return { role: input.role as InvitationTenantRole, teams }
}
