const FORBIDDEN_EMAIL_CHARACTERS = new Set(['<', '>', ',', ';'])

export function isSingleEmailAddress(value: string) {
  if (!value || value.length > 320) return false

  for (const character of value) {
    if (!character.trim() || FORBIDDEN_EMAIL_CHARACTERS.has(character)) return false
  }

  const separator = value.indexOf('@')
  if (separator <= 0 || separator !== value.lastIndexOf('@') || separator === value.length - 1) return false

  const domain = value.slice(separator + 1)
  const finalDot = domain.lastIndexOf('.')
  return finalDot > 0 && finalDot < domain.length - 1
}
