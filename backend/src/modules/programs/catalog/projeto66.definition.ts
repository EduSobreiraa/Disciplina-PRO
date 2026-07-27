import type { ProgramVersionDefinition } from '../domain/program-policy.js'

const privateResponse = { privateResponse: { enabled: true, maximumPayloadBytes: 16_384 } }

function activity(
  key: string,
  title: string,
  position: number,
  type: 'CHECKLIST' | 'MISSION' | 'MEDITATION' | 'REFLECTION',
  frequency: 'ONCE' | 'DAILY' = 'DAILY',
  configuration: Record<string, unknown> = {},
) {
  return {
    key,
    title,
    description: title,
    position,
    type,
    frequency,
    configuration,
  }
}

const checklist = [
  ['morning-1', 'Acordar no primeiro toque'],
  ['morning-2', 'Arrumar a cama'],
  ['morning-3', 'Meditação e visualização'],
  ['morning-4', 'Movimentar o corpo'],
  ['morning-5', 'Definir as três missões'],
  ['day-1', 'Atacar a tarefa mais difícil'],
  ['day-2', 'Executar um bloco de foco'],
  ['day-3', 'Vencer uma desculpa com ação'],
  ['day-4', 'Fazer uma renúncia consciente'],
  ['night-1', 'Cumprir as três missões'],
  ['night-2', 'Revisar o dia com placar'],
  ['night-3', 'Preparar o amanhã'],
] as const

export const PROJETO66_REQUIRED_ACTIVITY_KEYS = [
  ...checklist.map(([key]) => key),
  'result',
  'health',
  'organization',
  'daily-reflection',
  'meditation',
  'new-self-definition',
  'new-self-checkin',
  'difficult-day',
  'crisis-support',
] as const

export const PROJETO66_CATALOG = {
  identity: {
    slug: 'projeto-66',
    name: 'Projeto 66',
    summary: 'Ciclo de 66 dias para disciplina, identidade e execução consciente.',
  },
  version: {
    title: 'Projeto 66 — Ciclo fundador',
    description: 'Jornada estruturada em três fases de 22 dias, com fatos objetivos e reflexões privadas.',
    durationDays: 66,
    executionConfiguration: {
      dailyRecord: {
        pillars: [
          { key: 'discipline', label: 'Disciplina', minimum: 0, maximum: 10 },
          { key: 'focus', label: 'Foco', minimum: 0, maximum: 10 },
          { key: 'self-control', label: 'Domínio Próprio', minimum: 0, maximum: 10 },
          { key: 'execution', label: 'Execução', minimum: 0, maximum: 10 },
          { key: 'emotional-control', label: 'Controle Emocional', minimum: 0, maximum: 10 },
          { key: 'vital-energy', label: 'Energia Vital', minimum: 0, maximum: 10 },
        ],
        requireAllPillars: true,
      },
    },
    phases: [
      {
        key: 'quebra-do-programa',
        title: 'Quebra do Programa',
        description: 'Identificar e interromper padrões automáticos.',
        position: 1,
        activities: [
          ...checklist.map(([key, title], index) => activity(key, title, index + 1, 'CHECKLIST')),
          activity('daily-reflection', 'Reflexão emocional e gratidão', 13, 'REFLECTION', 'DAILY', privateResponse),
          activity('meditation', 'Meditação guiada', 14, 'MEDITATION', 'DAILY', privateResponse),
          activity('crisis-support', 'Modo crise', 15, 'REFLECTION', 'DAILY', privateResponse),
        ],
      },
      {
        key: 'construcao-do-novo-eu',
        title: 'Construção do Novo Eu',
        description: 'Treinar pensamentos, emoções e ações coerentes com a identidade escolhida.',
        position: 2,
        activities: [
          activity('result', 'Missão de resultado', 1, 'MISSION'),
          activity('health', 'Missão de saúde', 2, 'MISSION'),
          activity('organization', 'Missão de organização', 3, 'MISSION'),
          activity('new-self-definition', 'Definição do Novo Eu', 4, 'REFLECTION', 'ONCE', privateResponse),
          activity('new-self-checkin', 'Check-in do Novo Eu', 5, 'REFLECTION', 'DAILY', privateResponse),
        ],
      },
      {
        key: 'consolidacao-da-identidade',
        title: 'Consolidação da Identidade',
        description: 'Transformar repetição consciente em identidade e execução consistente.',
        position: 3,
        activities: [
          activity('difficult-day', 'Registro de dia difícil', 1, 'REFLECTION', 'DAILY', privateResponse),
        ],
      },
    ],
  } satisfies ProgramVersionDefinition,
} as const
