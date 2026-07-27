import { INTERNAL_EVENT_TYPES } from '../../events/application/internal-event.contracts.js'

export interface XpRule {
  key: string
  eventType: string
  amount: number
  description: string
}

export const XP_RULES: readonly XpRule[] = [
  {
    key: 'execution.activity-completion.v1',
    eventType: INTERNAL_EVENT_TYPES.activityCompletionRecorded,
    amount: 10,
    description: 'Atividade de programa concluída',
  },
  {
    key: 'execution.daily-record.v1',
    eventType: INTERNAL_EVENT_TYPES.dailyRecordSubmitted,
    amount: 50,
    description: 'Dia do programa registrado',
  },
  {
    key: 'execution.enrollment-completed.v1',
    eventType: INTERNAL_EVENT_TYPES.enrollmentCompleted,
    amount: 500,
    description: 'Programa concluído',
  },
]

export const GAMIFICATION_LEVELS = [
  { level: 1, key: 'recruit', name: 'Recruta', minimum: 0 },
  { level: 2, key: 'soldier', name: 'Soldado', minimum: 500 },
  { level: 3, key: 'elite', name: 'Elite', minimum: 1500 },
  { level: 4, key: 'commander', name: 'Comandante', minimum: 3000 },
] as const

export const ACHIEVEMENTS = [
  { key: 'first-xp', name: 'Primeira faísca', description: 'Conquistou os primeiros pontos.', minimumXp: 1 },
  { key: 'project-day', name: 'Dia de comando', description: 'Registrou um dia de programa.', eventType: INTERNAL_EVENT_TYPES.dailyRecordSubmitted },
  { key: 'xp-500', name: 'Soldado', description: 'Alcançou 500 XP.', minimumXp: 500 },
  { key: 'xp-1500', name: 'Elite', description: 'Alcançou 1500 XP.', minimumXp: 1500 },
  { key: 'xp-3000', name: 'Comandante', description: 'Alcançou 3000 XP.', minimumXp: 3000 },
] as const

export function ruleFor(eventType: string, version: number) {
  if (version !== 1) return null
  return XP_RULES.find((rule) => rule.eventType === eventType) ?? null
}

export function unlockedAchievementKeys(balance: number, eventType: string) {
  return ACHIEVEMENTS
    .filter((achievement) => (
      ('minimumXp' in achievement && balance >= achievement.minimumXp)
      || ('eventType' in achievement && achievement.eventType === eventType)
    ))
    .map(({ key }) => key)
}

export function summarizeLevel(total: number) {
  const balance = Math.max(0, total)
  const level = [...GAMIFICATION_LEVELS].reverse().find(({ minimum }) => balance >= minimum) ?? GAMIFICATION_LEVELS[0]
  const nextLevel = GAMIFICATION_LEVELS.find(({ minimum }) => minimum > balance) ?? null
  const progress = nextLevel
    ? Math.round(((balance - level.minimum) / (nextLevel.minimum - level.minimum)) * 100)
    : 100
  return { balance, level, nextLevel, progress }
}

