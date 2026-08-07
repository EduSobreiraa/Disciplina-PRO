import { TIMER_SECONDS } from '../data/ritual-content.js'

export class DailyRitualApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'DailyRitualApiError'
    this.status = status
    this.code = code
  }
}

export function getDateKeyInTimeZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function mapRitualDay(day, sections) {
  const checks = {}
  for (const check of day?.checks ?? []) {
    const section = sections.find(({ key }) => key === check.sectionKey)
    const index = section?.items.findIndex(([itemKey]) => itemKey === check.itemKey) ?? -1
    if (index >= 0) checks[check.sectionKey] = { ...checks[check.sectionKey], [index]: true }
  }
  return {
    checks,
    timer: day?.timer ?? { completedCycles: 0, remainingSeconds: TIMER_SECONDS, runningStartedAt: null, runningUntil: null },
  }
}

export function createDailyRitualHttpRepository({ baseUrl = '/api', getTenantId, authorizedFetch }) {
  async function request(path, options = {}) {
    const tenantId = getTenantId()
    if (!tenantId) throw new DailyRitualApiError(0, 'SESSION_CONTEXT_REQUIRED', 'Organização não selecionada')
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
      throw new DailyRitualApiError(response.status, problem.code ?? 'REQUEST_FAILED', problem.message ?? 'Não foi possível atualizar o ritual')
    }
    return response.json()
  }

  return {
    async load(date) {
      const response = await request(`/ritual/me?from=${date}&to=${date}`)
      return response.days[0] ?? null
    },
    setCheck(date, sectionKey, itemKey, completed) {
      return request(`/ritual/me/${date}/checks/${sectionKey}/${itemKey}`, { method: 'PUT', body: JSON.stringify({ completed }) })
    },
    changeTimer(date, action) {
      return request(`/ritual/me/${date}/timer/${action}`, { method: 'POST' })
    },
  }
}
