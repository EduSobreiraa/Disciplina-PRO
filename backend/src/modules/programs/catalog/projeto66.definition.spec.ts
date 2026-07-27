import { normalizeVersionDefinition } from '../domain/program-policy.js'
import { PROJETO66_CATALOG, PROJETO66_REQUIRED_ACTIVITY_KEYS } from './projeto66.definition.js'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

describe('Projeto 66 catalog definition', () => {
  it('is publishable and contains every frontend contract key exactly once', () => {
    const normalized = normalizeVersionDefinition(PROJETO66_CATALOG.version, true)
    const keys = normalized.phases.flatMap(({ activities }) => activities.map(({ key }) => key))
    expect(keys).toHaveLength(PROJETO66_REQUIRED_ACTIVITY_KEYS.length)
    expect(new Set(keys)).toEqual(new Set(PROJETO66_REQUIRED_ACTIVITY_KEYS))
    expect(normalized).toMatchObject({
      durationDays: 66,
      executionConfiguration: { dailyRecord: { requireAllPillars: true, pillars: expect.any(Array) as unknown[] } },
    })
  })

  it('matches the activity contract imported by the real frontend', async () => {
    const contractUrl = pathToFileURL(resolve(process.cwd(), '../frontend/src/modules/projeto66/data/projeto66-contract.js')).href
    const contract = await import(contractUrl) as { PROJETO66_CONSUMED_ACTIVITY_KEYS: string[] }
    expect(new Set(PROJETO66_REQUIRED_ACTIVITY_KEYS)).toEqual(new Set(contract.PROJETO66_CONSUMED_ACTIVITY_KEYS))
  })

  it('keeps private forms on dedicated activities with explicit policies', () => {
    const activities = PROJETO66_CATALOG.version.phases.flatMap(({ activities }) => activities)
    for (const key of ['daily-reflection', 'meditation', 'new-self-definition', 'new-self-checkin', 'difficult-day', 'crisis-support']) {
      expect(activities.find((activity) => activity.key === key)?.configuration).toMatchObject({
        privateResponse: { enabled: true, maximumPayloadBytes: 16_384 },
      })
    }
    expect(activities.find(({ key }) => key === 'new-self-definition')?.frequency).toBe('ONCE')
  })
})
