export class TenantAdministrationApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'TenantAdministrationApiError'
    this.status = status
    this.code = code
  }
}

export function createTenantAdministrationHttpRepository({ baseUrl = '/api', getTenantId, authorizedFetch }) {
  async function request(path, options = {}) {
    const tenantId = getTenantId()
    if (!tenantId) throw new TenantAdministrationApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
    const response = await authorizedFetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'X-Tenant-Id': tenantId,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}))
      throw new TenantAdministrationApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Não foi possível carregar a administração')
    }
    return response.json()
  }

  return {
    listMemberships: () => request('/memberships'),
    listTeams: () => request('/teams'),
    createTeam: (name) => request('/teams', { method: 'POST', body: JSON.stringify({ name }) }),
    renameTeam: (teamId, name) => request(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    archiveTeam: (teamId) => request(`/teams/${teamId}/archive`, { method: 'PATCH' }),
    restoreTeam: (teamId) => request(`/teams/${teamId}/restore`, { method: 'PATCH' }),
    changeMembershipRole: (membershipId, role) => request(`/memberships/${membershipId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    changeMembershipStatus: (membershipId, action, reason) => request(`/memberships/${membershipId}/${action}`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    assignTeamMembership: (teamId, membershipId, role) => request(`/teams/${teamId}/memberships`, { method: 'POST', body: JSON.stringify({ membershipId, role }) }),
    endTeamMembership: (teamId, membershipId) => request(`/teams/${teamId}/memberships/${membershipId}/end`, { method: 'PATCH' }),
    listInvitations: () => request('/invitations'),
    createInvitation: (input) => request('/invitations', { method: 'POST', body: JSON.stringify(input) }),
    resendInvitation: (invitationId) => request(`/invitations/${invitationId}/resend`, { method: 'PATCH' }),
    revokeInvitation: (invitationId) => request(`/invitations/${invitationId}/revoke`, { method: 'PATCH' }),
    getTenantReport: () => request('/reports/tenant'),
    getTeamReport: (teamId) => request(`/reports/teams/${teamId}`),
    getTenantAudit: (page = 1, limit = 20) => request(`/audit/tenant?page=${page}&limit=${limit}`),
    getTeamAudit: (teamId, page = 1, limit = 20) => request(`/audit/teams/${teamId}?page=${page}&limit=${limit}`),
  }
}
