export class MissionsApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'MissionsApiError'
    this.status = status
    this.code = code
  }
}

export function createMissionsHttpRepository({ baseUrl = '/api', getTenantId, authorizedFetch }) {
  return {
    async loadMine() {
      const tenantId = getTenantId()
      if (!tenantId) throw new MissionsApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
      const response = await authorizedFetch(`${baseUrl}/missions/me`, { headers: { 'X-Tenant-Id': tenantId } })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new MissionsApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Não foi possível carregar as missões')
      }
      return response.json()
    },
  }
}
