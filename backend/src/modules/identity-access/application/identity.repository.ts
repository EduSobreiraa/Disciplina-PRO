export interface CreatedUser {
  id: string
  email: string
}

export interface BootstrapResult {
  userId: string
  platformAccessId: string
  email: string
}

export abstract class IdentityRepository {
  abstract createUser(input: { email: string; normalizedEmail: string; passwordHash: string }): Promise<CreatedUser>
  abstract bootstrapSuperAdmin(input: { email: string; normalizedEmail: string; passwordHash: string }): Promise<BootstrapResult>
}
