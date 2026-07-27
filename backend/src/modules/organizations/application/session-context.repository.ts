export interface SessionContextView {
  user: {
    id: string
    email: string
  }
  organizations: Array<{
    tenant: {
      id: string
      name: string
      slug: string
      timeZone: string
    }
    membership: {
      id: string
      role: string
    }
  }>
  platformAccess: {
    id: string
    role: string
  } | null
}

export abstract class SessionContextRepository {
  abstract findByUserId(userId: string): Promise<SessionContextView | null>
}
