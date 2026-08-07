export class PlatformAdministrationApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'PlatformAdministrationApiError'
    this.status = status
    this.code = code
  }
}

export function createPlatformAdministrationHttpRepository({ baseUrl = '/api', authorizedFetch }) {
  async function request(path, options = {}) {
    const response = await authorizedFetch(`${baseUrl}/platform${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    })
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}))
      throw new PlatformAdministrationApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Operação de plataforma não concluída')
    }
    return response.json()
  }

  return {
    listTenants: () => request('/tenants'),
    listPrograms: () => request('/programs'),
    createTenant: (input) => request('/tenants', { method: 'POST', body: JSON.stringify(input) }),
    transitionTenant: (tenantId, action, reason) => request(`/tenants/${tenantId}/${action}`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    inviteFirstCeo: (tenantId, email) => request(`/tenants/${tenantId}/invitations/ceo`, { method: 'POST', body: JSON.stringify({ email }) }),
    setProgramEnabled: (tenantId, programId, enabled) => request(`/tenants/${tenantId}/programs/${programId}/${enabled ? 'enable' : 'disable'}`, { method: 'PUT' }),
  }
}
