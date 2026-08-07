export const RITUAL_TIMER_SECONDS = 30 * 60
export const RITUAL_TOTAL_CYCLES = 8

export const RITUAL_ITEMS = {
  opening: ['review-panel', 'declare-behaviors', 'critical-behavior', 'check-schedule'],
  execution: ['immediate-mark', 'whatsapp-30-30', 'praise-three', 'daily-feedback', 'target-hit'],
  closing: ['audit-day', 'justify-failures', 'pending-items', 'lost-sales', 'read-score'],
  weekly: ['horizontal-review', 'group-justifications', 'public-celebration', 'next-week-commitment', 'weekly-backup'],
} as const

export function isRitualItem(sectionKey: string, itemKey: string) {
  return Object.hasOwn(RITUAL_ITEMS, sectionKey)
    && (RITUAL_ITEMS[sectionKey as keyof typeof RITUAL_ITEMS] as readonly string[]).includes(itemKey)
}
