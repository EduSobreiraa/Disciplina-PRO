import assert from 'node:assert/strict'
import test from 'node:test'
import { acceptInvitation, readInvitationToken } from './invitation-acceptance.client.js'

test('reads only a valid invitation token from the fragment', () => {
  const token = 'a'.repeat(43)
  assert.equal(readInvitationToken(`#token=${token}`), token)
  for (const hash of ['', '#token=short', `#token=${'!'.repeat(43)}`]) assert.equal(readInvitationToken(hash), null)
})

test('sends a new identity password and token in the body, never URL', async () => {
  const token = 'a'.repeat(43)
  await acceptInvitation({ token, password: 'Uma frase de senha segura', existingIdentity: false, fetchImplementation: async (url, options) => {
    assert.equal(url, '/api/invitations/accept/new-identity')
    assert.deepEqual(JSON.parse(options.body), { token, password: 'Uma frase de senha segura' })
    return { ok: true }
  } })
})

test('existing identity uses the session client without sending a password', async () => {
  const token = 'a'.repeat(43)
  await acceptInvitation({ token, password: 'not-sent', existingIdentity: true, sessionClient: { authorizedFetch: async (url, options) => {
    assert.equal(url, '/api/invitations/accept/existing-identity')
    assert.deepEqual(JSON.parse(options.body), { token })
    return { ok: true }
  } } })
})

test('preserves API error codes without exposing raw server responses', async () => {
  await assert.rejects(acceptInvitation({ token: 'a'.repeat(43), existingIdentity: false, fetchImplementation: async () => ({ ok: false, status: 409, json: async () => ({ code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED', message: 'private detail' }) }) }), { code: 'EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED', message: 'Não foi possível aceitar o convite.' })
})
