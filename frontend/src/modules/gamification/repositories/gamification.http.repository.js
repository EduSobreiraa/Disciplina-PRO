export class GamificationApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'GamificationApiError'
    this.status = status
    this.code = code
  }
}

export function createGamificationHttpRepository({
  baseUrl = '/api',
  getTenantId,
  authorizedFetch,
}) {
  return {
    async loadMine() {
      const tenantId = getTenantId()
      if (!tenantId) throw new GamificationApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
      const response = await authorizedFetch(`${baseUrl}/gamification/me`, {
        headers: { 'X-Tenant-Id': tenantId },
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new GamificationApiError(
          response.status,
          problem.code ?? 'REQUEST_FAILED',
          problem.message ?? 'Não foi possível carregar a gamificação',
        )
      }
      return response.json()
    },
  }
}
