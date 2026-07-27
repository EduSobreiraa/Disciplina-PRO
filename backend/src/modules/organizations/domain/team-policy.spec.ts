import { InvalidTeamDataError } from './organization.errors.js'
import { normalizeTeamName, validateTeamId } from './team-policy.js'

describe('team policy', () => {
  it('normaliza nome de exibição e nome comparável', () => {
    expect(normalizeTeamName('  Operações   São Paulo  ')).toEqual({
      name: 'Operações São Paulo',
      normalizedName: 'operações são paulo',
    })
  })

  it.each(['', 'a', ' '.repeat(3), 'x'.repeat(161)])('rejeita nome inválido', (name) => {
    expect(() => normalizeTeamName(name)).toThrow(InvalidTeamDataError)
  })

  it('valida UUID e rejeita identificador malformado', () => {
    const id = '019f854f-58c7-7d1c-85ec-b855ee159027'
    expect(validateTeamId(id)).toBe(id)
    expect(() => validateTeamId('not-a-uuid')).toThrow(InvalidTeamDataError)
  })
})
