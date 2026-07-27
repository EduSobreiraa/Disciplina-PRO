export class SessionApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'SessionApiError'
    this.status = status
    this.code = code
  }
}

function cookieValue(cookieHeader, names) {
  for (const name of names) {
    const encoded = cookieHeader.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
    if (encoded) {
      try { return decodeURIComponent(encoded) } catch { return null }
    }
  }
  return null
}

export function createSessionClient({
  baseUrl = '/api',
  fetchImplementation = fetch,
  getCookie = () => document.cookie,
}) {
  let accessToken = null
  let expiresAt = null
  let refreshFlight = null

  async function parse(response) {
    if (response.ok) return response.status === 204 ? null : response.json()
    const problem = await response.json().catch(() => ({}))
    throw new SessionApiError(
      response.status,
      problem.code ?? 'REQUEST_FAILED',
      problem.message ?? 'Falha na sessão',
    )
  }

  function acceptAccess(session) {
    accessToken = session.accessToken
    expiresAt = session.expiresAt
    return session
  }

  function csrfToken() {
    return cookieValue(getCookie(), ['__Host-dp_csrf', 'dp_csrf'])
  }

  async function refresh() {
    if (!refreshFlight) {
      refreshFlight = (async () => {
        const csrf = csrfToken()
        if (!csrf) throw new SessionApiError(401, 'INVALID_SESSION', 'Sessão indisponível')
        const response = await fetchImplementation(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': csrf },
        })
        return acceptAccess(await parse(response))
      })().catch((error) => {
        accessToken = null
        expiresAt = null
        throw error
      }).finally(() => {
        refreshFlight = null
      })
    }
    return refreshFlight
  }

  async function authorizedFetch(url, options = {}) {
    if (!accessToken) await refresh()
    const execute = () => fetchImplementation(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    })
    let response = await execute()
    if (response.status === 401) {
      await refresh()
      response = await execute()
    }
    return response
  }

  return {
    getAccessToken: () => accessToken,
    getExpiresAt: () => expiresAt,
    async login(email, password) {
      const response = await fetchImplementation(`${baseUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      return acceptAccess(await parse(response))
    },
    restore: refresh,
    authorizedFetch,
    async context() {
      return parse(await authorizedFetch(`${baseUrl}/session`))
    },
    async logout() {
      const csrf = csrfToken()
      try {
        if (csrf) {
          await parse(await fetchImplementation(`${baseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrf },
          }))
        }
      } finally {
        accessToken = null
        expiresAt = null
      }
    },
  }
}

export { cookieValue as readCookieValue }
