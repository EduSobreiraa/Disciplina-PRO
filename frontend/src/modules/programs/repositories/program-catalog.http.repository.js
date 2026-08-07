export class ProgramCatalogApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ProgramCatalogApiError'
    this.status = status
    this.code = code
  }
}

export function createProgramCatalogHttpRepository({
  baseUrl = '/api',
  getTenantId,
  authorizedFetch,
}) {
  return {
    async list() {
      const tenantId = getTenantId()
      if (!tenantId) {
        throw new ProgramCatalogApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
      }

      const response = await authorizedFetch(`${baseUrl}/programs`, {
        headers: { 'X-Tenant-Id': tenantId },
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new ProgramCatalogApiError(
          response.status,
          problem.code ?? 'REQUEST_FAILED',
          problem.message ?? 'Não foi possível carregar os programas',
        )
      }
      return response.json()
    },
  }
}
