export const PROJETO66_PROGRAM_SLUG = 'projeto-66'

export const PROJETO66_ACTIVITY_KEYS = Object.freeze({
  dailyReflection: 'daily-reflection',
  meditation: 'meditation',
  newSelfDefinition: 'new-self-definition',
  newSelfCheckin: 'new-self-checkin',
  difficultDay: 'difficult-day',
  crisisSupport: 'crisis-support',
  missions: Object.freeze({
    result: 'result',
    health: 'health',
    organization: 'organization',
  }),
})

export const projeto66ChecklistActivityKey = (period, index) => `${period}-${index + 1}`

export const PROJETO66_CONSUMED_ACTIVITY_KEYS = Object.freeze([
  ...Array.from({ length: 5 }, (_, index) => projeto66ChecklistActivityKey('morning', index)),
  ...Array.from({ length: 4 }, (_, index) => projeto66ChecklistActivityKey('day', index)),
  ...Array.from({ length: 3 }, (_, index) => projeto66ChecklistActivityKey('night', index)),
  ...Object.values(PROJETO66_ACTIVITY_KEYS.missions),
  PROJETO66_ACTIVITY_KEYS.dailyReflection,
  PROJETO66_ACTIVITY_KEYS.meditation,
  PROJETO66_ACTIVITY_KEYS.newSelfDefinition,
  PROJETO66_ACTIVITY_KEYS.newSelfCheckin,
  PROJETO66_ACTIVITY_KEYS.difficultDay,
  PROJETO66_ACTIVITY_KEYS.crisisSupport,
])
