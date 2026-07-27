export class Projeto66ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'Projeto66ApiError'
    this.status = status
    this.code = code
  }
}

function toCycle(detail) {
  const dailyRecords = Object.fromEntries(detail.dailyRecords.map((record) => {
    const pillars = Object.fromEntries(record.pillarScores.map(({ pillarKey, score }) => [pillarKey, score]))
    return [record.programDay, {
      programDay: record.programDay,
      pillars,
      score: Object.values(pillars).reduce((total, value) => total + value, 0),
      recordedAt: record.submittedAt,
    }]
  }))
  const activities = Object.fromEntries(detail.activities.map((activity) => [activity.key, activity]))
  const checklistByDay = {}
  for (const completion of detail.activityCompletions) {
    const activity = detail.activities.find(({ id }) => id === completion.activityId)
    if (!activity) continue
    checklistByDay[completion.programDay] = {
      ...checklistByDay[completion.programDay],
      [activity.key]: true,
    }
  }
  return {
    id: detail.id,
    status: detail.status,
    startedAt: detail.startedAt,
    currentDay: detail.calendar?.programDay ?? 0,
    durationDays: detail.version?.durationDays ?? 0,
    completedDays: detail.dailyRecords.map(({ programDay }) => programDay),
    dailyRecords,
    checklistByDay,
    activities,
  }
}

export function createProjeto66HttpRepository({
  baseUrl = '/api',
  getAccessToken,
  getTenantId,
  fetchImplementation = fetch,
}) {
  async function request(path, options = {}) {
    const accessToken = getAccessToken()
    const tenantId = getTenantId()
    if (!accessToken || !tenantId) throw new Projeto66ApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Sessão empresarial indisponível')
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Tenant-Id': tenantId,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}))
      throw new Projeto66ApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Falha na comunicação com o programa')
    }
    if (response.status === 204) return null
    return response.json()
  }

  return {
    async listEnrollments() {
      return request('/enrollments')
    },
    async loadCycle(enrollmentId) {
      return toCycle(await request(`/enrollments/${enrollmentId}`))
    },
    async startCycle(enrollmentId) {
      await request(`/enrollments/${enrollmentId}/start`, { method: 'POST' })
      return this.loadCycle(enrollmentId)
    },
    async saveDailyRecord(enrollmentId, pillars) {
      await request(`/enrollments/${enrollmentId}/daily-record`, {
        method: 'PUT',
        body: JSON.stringify({
          scores: Object.entries(pillars).map(([pillarKey, score]) => ({ pillarKey, score })),
        }),
      })
      return this.loadCycle(enrollmentId)
    },
    async completeActivity(enrollmentId, activityId) {
      await request(`/enrollments/${enrollmentId}/activities/${activityId}/completion`, { method: 'PUT' })
      return this.loadCycle(enrollmentId)
    },
    async loadPrivateResponse(enrollmentId, activityId) {
      return request(`/enrollments/${enrollmentId}/private-responses/${activityId}`)
    },
    async savePrivateResponse(enrollmentId, activityId, payload) {
      return request(`/enrollments/${enrollmentId}/private-responses/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify({ payload }),
      })
    },
  }
}

export { toCycle as mapEnrollmentToProjeto66Cycle }
