import { SessionApiError } from '../auth/session.client.js'

export function readInvitationToken(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? ''
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

export async function acceptInvitation({ token, password, sessionClient, existingIdentity, fetchImplementation = fetch }) {
  const request = existingIdentity ? sessionClient.authorizedFetch : fetchImplementation
  const response = await request(`/api/invitations/accept/${existingIdentity ? 'existing-identity' : 'new-identity'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(existingIdentity ? { token } : { token, password }),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    throw new SessionApiError(response.status, problem.code ?? 'REQUEST_FAILED', 'Não foi possível aceitar o convite.')
  }
}
