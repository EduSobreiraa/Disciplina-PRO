import { InvalidProgramDataError, ProgramVersionNotPublishableError } from './program.errors.js'

export const ACTIVITY_TYPES = ['CHECKLIST', 'TASK', 'MISSION', 'DAILY_SCORE', 'MEDITATION', 'REFLECTION'] as const
export const ACTIVITY_FREQUENCIES = ['ONCE', 'DAILY', 'WEEKLY'] as const
export type ActivityType = typeof ACTIVITY_TYPES[number]
export type ActivityFrequency = typeof ACTIVITY_FREQUENCIES[number]

export interface ProgramActivityDefinition {
  key: string
  title: string
  description: string
  position: number
  type: ActivityType
  frequency: ActivityFrequency
  configuration: Record<string, unknown>
}

export interface ProgramPhaseDefinition {
  key: string
  title: string
  description: string
  position: number
  activities: ProgramActivityDefinition[]
}

export interface ProgramVersionDefinition {
  title: string
  description: string
  durationDays: number
  executionConfiguration?: ProgramExecutionConfiguration
  phases: ProgramPhaseDefinition[]
}

export interface ProgramExecutionConfiguration {
  dailyRecord?: {
    pillars: Array<{ key: string; label: string; minimum: number; maximum: number }>
    requireAllPillars: boolean
  }
}

function text(value: string, field: string, maximum: number) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized || normalized.length > maximum) throw new InvalidProgramDataError(`${field} inválido`)
  return normalized
}

export function normalizeProgramIdentity(input: { slug: string; name: string; summary: string }) {
  const slug = input.slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw new InvalidProgramDataError('Slug inválido')
  return { slug, name: text(input.name, 'Nome', 160), summary: text(input.summary, 'Resumo', 4_000) }
}

export function normalizeVersionDefinition(input: ProgramVersionDefinition, publishable = false): ProgramVersionDefinition {
  if (!Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 3_650) throw new InvalidProgramDataError('Duração inválida')
  const phaseKeys = new Set<string>()
  const activityKeys = new Set<string>()
  const phases = input.phases.map((phase, phaseIndex) => {
    if (phase.position !== phaseIndex + 1) throw new InvalidProgramDataError('Posições de fases devem ser contíguas')
    const key = functionalKey(phase.key)
    if (phaseKeys.has(key)) throw new InvalidProgramDataError('Chave de fase duplicada')
    phaseKeys.add(key)
    const activities = phase.activities.map((activity, activityIndex) => {
      if (activity.position !== activityIndex + 1) throw new InvalidProgramDataError('Posições de atividades devem ser contíguas')
      const activityKey = functionalKey(activity.key)
      if (activityKeys.has(activityKey)) throw new InvalidProgramDataError('Chave de atividade duplicada')
      activityKeys.add(activityKey)
      if (!ACTIVITY_TYPES.includes(activity.type) || !ACTIVITY_FREQUENCIES.includes(activity.frequency)) throw new InvalidProgramDataError('Tipo ou frequência inválidos')
      return { ...activity, key: activityKey, title: text(activity.title, 'Título da atividade', 160), description: text(activity.description, 'Descrição da atividade', 10_000), configuration: normalizeActivityConfiguration(activity.configuration) }
    })
    return { ...phase, key, title: text(phase.title, 'Título da fase', 160), description: text(phase.description, 'Descrição da fase', 10_000), activities }
  })
  if (publishable && (phases.length === 0 || phases.some((phase) => phase.activities.length === 0))) throw new ProgramVersionNotPublishableError()
  return {
    title: text(input.title, 'Título', 160),
    description: text(input.description, 'Descrição', 10_000),
    durationDays: input.durationDays,
    executionConfiguration: normalizeExecutionConfiguration(input.executionConfiguration ?? {}),
    phases,
  }
}

function normalizeActivityConfiguration(input: Record<string, unknown>): Record<string, unknown> {
  if (!plainObject(input)) throw new InvalidProgramDataError('Configuração inválida')
  const allowed = ['estimatedMinutes', 'itemCount', 'items', 'privateResponse']
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw new InvalidProgramDataError('Propriedade de atividade desconhecida')
  const normalized: Record<string, unknown> = {}
  for (const key of ['estimatedMinutes', 'itemCount', 'items'] as const) {
    const value = input[key]
    if (value !== undefined) {
      if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > (key === 'estimatedMinutes' ? 1_440 : 100)) throw new InvalidProgramDataError('Configuração de atividade inválida')
      normalized[key] = value
    }
  }
  if (input.privateResponse !== undefined) {
    const value = input.privateResponse
    if (!plainObject(value) || Object.keys(value).some((key) => !['enabled', 'maximumPayloadBytes'].includes(key)) || value.enabled !== true || !Number.isInteger(value.maximumPayloadBytes) || Number(value.maximumPayloadBytes) < 256 || Number(value.maximumPayloadBytes) > 65_536) throw new InvalidProgramDataError('Resposta privada inválida')
    normalized.privateResponse = { enabled: true, maximumPayloadBytes: value.maximumPayloadBytes }
  }
  return normalized
}

export function normalizeExecutionConfiguration(input: ProgramExecutionConfiguration): ProgramExecutionConfiguration {
  if (!plainObject(input) || Object.keys(input).some((key) => key !== 'dailyRecord')) throw new InvalidProgramDataError('Configuração de execução inválida')
  if (!input.dailyRecord) return {}
  const daily = input.dailyRecord
  if (!plainObject(daily) || Object.keys(daily).some((key) => !['pillars', 'requireAllPillars'].includes(key))) throw new InvalidProgramDataError('Registro diário inválido')
  if (!Array.isArray(daily.pillars) || daily.pillars.length < 1 || daily.pillars.length > 20 || typeof daily.requireAllPillars !== 'boolean') throw new InvalidProgramDataError('Pilares inválidos')
  const keys = new Set<string>()
  const pillars = daily.pillars.map((pillar) => {
    if (!plainObject(pillar) || Object.keys(pillar).some((key) => !['key', 'label', 'minimum', 'maximum'].includes(key))) throw new InvalidProgramDataError('Pilar inválido')
    if (typeof pillar.key !== 'string' || typeof pillar.label !== 'string' || typeof pillar.minimum !== 'number' || typeof pillar.maximum !== 'number') throw new InvalidProgramDataError('Pilar inválido')
    const key = functionalKey(pillar.key)
    if (keys.has(key) || !Number.isInteger(pillar.minimum) || !Number.isInteger(pillar.maximum) || pillar.minimum < 0 || pillar.maximum > 100 || pillar.minimum >= pillar.maximum) throw new InvalidProgramDataError('Pilar inválido')
    keys.add(key)
    return { key, label: text(pillar.label, 'Rótulo do pilar', 80), minimum: pillar.minimum, maximum: pillar.maximum }
  })
  return { dailyRecord: { pillars, requireAllPillars: daily.requireAllPillars } }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function functionalKey(value: string) {
  const key = value.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) || key.length > 80) throw new InvalidProgramDataError('Chave funcional inválida')
  return key
}
