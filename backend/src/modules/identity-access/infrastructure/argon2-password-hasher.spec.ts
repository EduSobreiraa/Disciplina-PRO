import { Argon2PasswordHasher } from './argon2-password-hasher.js'

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher()

  it('hashes with Argon2id and verifies without exposing the password', async () => {
    const password = 'uma frase realmente segura'
    const encodedHash = await hasher.hash(password)

    expect(encodedHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    expect(encodedHash).not.toContain(password)
    await expect(hasher.verify(encodedHash, password)).resolves.toBe(true)
    await expect(hasher.verify(encodedHash, 'senha incorreta e extensa')).resolves.toBe(false)
  })
})
