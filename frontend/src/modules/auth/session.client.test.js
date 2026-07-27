import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionClient, readCookieValue, SessionApiError } from './session.client.js'

function response(status, body = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

test('reads development and production CSRF cookies safely', () => {
  assert.equal(readCookieValue('x=1; dp_csrf=token%20signed', ['__Host-dp_csrf', 'dp_csrf']), 'token signed')
  assert.equal(readCookieValue('__Host-dp_csrf=production', ['__Host-dp_csrf', 'dp_csrf']), 'production')
})

test('keeps access token in memory and restores context with a single refresh', async () => {
  const calls = []
  const client = createSessionClient({
    baseUrl: 'https://api.example.test/api',
    getCookie: () => 'dp_csrf=signed',
    fetchImplementation: async (url, options) => {
      calls.push({ url, options })
      if (url.endsWith('/auth/refresh')) return response(200, { accessToken: 'restored', expiresAt: '2026-07-26T00:00:00.000Z' })
      return response(200, { user: { id: 'user' }, organizations: [] })
    },
  })
  const [left, right] = await Promise.all([client.context(), client.context()])
  assert.deepEqual(left, right)
  assert.equal(calls.filter(({ url }) => url.endsWith('/auth/refresh')).length, 1)
  assert.equal(client.getAccessToken(), 'restored')
  assert.equal(calls.filter(({ url }) => url.endsWith('/session')).length, 2)
})

test('rotates once and retries an authorized request after a 401', async () => {
  let protectedAttempts = 0
  let refreshes = 0
  const client = createSessionClient({
    getCookie: () => 'dp_csrf=signed',
    fetchImplementation: async (url) => {
      if (url.endsWith('/auth/login')) return response(200, { accessToken: 'initial', expiresAt: 'soon' })
      if (url.endsWith('/auth/refresh')) {
        refreshes += 1
        return response(200, { accessToken: 'rotated', expiresAt: 'later' })
      }
      protectedAttempts += 1
      return protectedAttempts === 1 ? response(401, { code: 'INVALID_ACCESS_TOKEN' }) : response(200, { ok: true })
    },
  })
  await client.login('user@example.test', 'safe password')
  const result = await client.authorizedFetch('/api/protected')
  assert.equal(result.status, 200)
  assert.equal(refreshes, 1)
})

test('clears memory when refresh is invalid', async () => {
  const client = createSessionClient({
    getCookie: () => 'dp_csrf=signed',
    fetchImplementation: async () => response(401, { code: 'INVALID_SESSION', message: 'Sessão inválida' }),
  })
  await assert.rejects(client.restore(), (error) => error instanceof SessionApiError && error.code === 'INVALID_SESSION')
  assert.equal(client.getAccessToken(), null)
})
