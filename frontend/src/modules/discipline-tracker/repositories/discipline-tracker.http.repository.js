export class DisciplineTrackerApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'DisciplineTrackerApiError'
    this.status = status
    this.code = code
  }
}

function monthRange(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return { from: `${prefix}-01`, to: `${prefix}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}` }
}

export function mapTrackerState(response) {
  const marks = {}
  const justifications = {}
  for (const mark of response.marks) {
    const key = `${mark.trackedOn.slice(0, 10)}:${mark.behaviorId}`
    marks[key] = mark.status === 'COMPLETED' ? 1 : 2
    if (mark.justification) justifications[key] = mark.justification
  }
  return {
    behaviors: response.behaviors.map(({ position, ...behavior }) => ({ ...behavior, order: position })),
    marks,
    justifications,
  }
}

export function createDisciplineTrackerHttpRepository({ baseUrl = '/api', getTenantId, authorizedFetch }) {
  async function request(path, options = {}) {
    const tenantId = getTenantId()
    if (!tenantId) throw new DisciplineTrackerApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
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
      throw new DisciplineTrackerApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Não foi possível atualizar o tracker')
    }
    return response.status === 204 ? null : response.json()
  }

  return {
    async load(year, month) {
      const { from, to } = monthRange(year, month)
      return mapTrackerState(await request(`/tracker/me?from=${from}&to=${to}`))
    },
    createBehavior(name) {
      return request('/tracker/behaviors', { method: 'POST', body: JSON.stringify({ name }) })
    },
    renameBehavior(behaviorId, name) {
      return request(`/tracker/behaviors/${behaviorId}`, { method: 'PATCH', body: JSON.stringify({ name }) })
    },
    archiveBehavior(behaviorId) {
      return request(`/tracker/behaviors/${behaviorId}`, { method: 'DELETE' })
    },
    putMark(behaviorId, date, status) {
      return request(`/tracker/behaviors/${behaviorId}/marks/${date}`, { method: 'PUT', body: JSON.stringify({ status }) })
    },
    deleteMark(behaviorId, date) {
      return request(`/tracker/behaviors/${behaviorId}/marks/${date}`, { method: 'DELETE' })
    },
    putJustification(behaviorId, date, text) {
      return request(`/tracker/behaviors/${behaviorId}/marks/${date}/justification`, { method: 'PUT', body: JSON.stringify({ text }) })
    },
    exportBackup() {
      return request('/tracker/backup')
    },
    restoreBackup(backup) {
      return request('/tracker/backup', { method: 'PUT', body: JSON.stringify(backup) })
    },
  }
}

export { monthRange as getTrackerMonthRange }
