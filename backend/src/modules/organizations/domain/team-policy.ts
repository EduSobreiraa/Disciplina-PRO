import { InvalidTeamDataError } from './organization.errors.js'

export function normalizeTeamName(value: string) {
  if (typeof value !== 'string') throw new InvalidTeamDataError('Nome do time inválido')
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (name.length < 2 || name.length > 160) throw new InvalidTeamDataError('Nome do time deve possuir entre 2 e 160 caracteres')
  return { name, normalizedName: name.toLocaleLowerCase('pt-BR') }
}

export function validateTeamId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new InvalidTeamDataError('Identificador do time inválido')
  }
  return value
}
