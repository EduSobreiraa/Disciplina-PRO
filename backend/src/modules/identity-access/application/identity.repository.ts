export interface CreatedUser {
  id: string
  email: string
}

export interface BootstrapResult {
  userId: string
  platformAccessId: string
  email: string
}

export interface LoginIdentity {
  id: string
  passwordHash: string
  status: 'ACTIVE' | 'DISABLED'
}

export abstract class IdentityRepository {
  abstract createUser(input: { email: string; normalizedEmail: string; passwordHash: string }): Promise<CreatedUser>
  abstract findForLogin(normalizedEmail: string): Promise<LoginIdentity | null>
  abstract bootstrapSuperAdmin(input: { email: string; normalizedEmail: string; passwordHash: string }): Promise<BootstrapResult>
}
