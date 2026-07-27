import { InvalidProgramDataError, ProgramVersionNotPublishableError } from './program.errors.js'
import { normalizeProgramIdentity, normalizeVersionDefinition, type ProgramVersionDefinition } from './program-policy.js'

function definition(): ProgramVersionDefinition {
  return {
    title: ' Programa consistente ',
    description: ' Definição global consistente. ',
    durationDays: 66,
    executionConfiguration: {
      dailyRecord: {
        pillars: [{ key: 'disciplina', label: ' Disciplina ', minimum: 0, maximum: 10 }],
        requireAllPillars: true,
      },
    },
    phases: [{
      key: 'fundacao',
      title: ' Fundação ',
      description: ' Primeira fase. ',
      position: 1,
      activities: [{
        key: 'ritual-diario',
        title: ' Ritual diário ',
        description: ' Atividade genérica. ',
        position: 1,
        type: 'CHECKLIST',
        frequency: 'DAILY',
        configuration: {},
      }],
    }],
  }
}

describe('Program policy', () => {
  it('normalizes identity and a contiguous publishable tree', () => {
    expect(normalizeProgramIdentity({ slug: ' Projeto-66 ', name: ' Projeto 66 ', summary: ' Programa principal. ' }))
      .toEqual({ slug: 'projeto-66', name: 'Projeto 66', summary: 'Programa principal.' })
    expect(normalizeVersionDefinition(definition(), true)).toMatchObject({
      title: 'Programa consistente',
      executionConfiguration: { dailyRecord: { pillars: [{ key: 'disciplina', label: 'Disciplina' }] } },
      phases: [{ title: 'Fundação', activities: [{ title: 'Ritual diário' }] }],
    })
  })

  it('rejects unknown capabilities, duplicate pillars, invalid limits, and private payload policies', () => {
    const unknown = definition()
    Reflect.set(unknown.executionConfiguration!, 'unknown', true)
    expect(() => normalizeVersionDefinition(unknown)).toThrow(InvalidProgramDataError)

    const duplicate = definition()
    duplicate.executionConfiguration!.dailyRecord!.pillars.push({ key: 'disciplina', label: 'Outra', minimum: 0, maximum: 10 })
    expect(() => normalizeVersionDefinition(duplicate)).toThrow(InvalidProgramDataError)

    const privatePolicy = definition()
    privatePolicy.phases[0].activities[0].configuration = { privateResponse: { enabled: true, maximumPayloadBytes: 128 } }
    expect(() => normalizeVersionDefinition(privatePolicy)).toThrow(InvalidProgramDataError)
  })

  it('rejects gaps, duplicate functional keys, and non-object configuration', () => {
    const gap = definition()
    gap.phases[0].position = 2
    expect(() => normalizeVersionDefinition(gap)).toThrow(InvalidProgramDataError)

    const duplicate = definition()
    duplicate.phases.push({ ...duplicate.phases[0], position: 2 })
    expect(() => normalizeVersionDefinition(duplicate)).toThrow(InvalidProgramDataError)

    const invalidConfiguration = definition()
    Reflect.set(invalidConfiguration.phases[0].activities[0], 'configuration', [])
    expect(() => normalizeVersionDefinition(invalidConfiguration)).toThrow(InvalidProgramDataError)
  })

  it('allows an incomplete draft but rejects it at publication', () => {
    const empty = { ...definition(), phases: [] }
    expect(normalizeVersionDefinition(empty)).toMatchObject({ phases: [] })
    expect(() => normalizeVersionDefinition(empty, true)).toThrow(ProgramVersionNotPublishableError)
  })
})
