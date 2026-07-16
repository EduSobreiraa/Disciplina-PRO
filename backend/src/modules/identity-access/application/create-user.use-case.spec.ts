import { jest } from '@jest/globals'
import { CreateUserUseCase } from './create-user.use-case.js'

describe('CreateUserUseCase', () => {
  it('normalizes identity and sends only a password hash to the repository', async () => {
    const repository = { createUser: jest.fn<() => Promise<{ id: string; email: string }>>() }
    const passwordHasher = { hash: jest.fn<() => Promise<string>>(), verify: jest.fn() }
    repository.createUser.mockResolvedValueOnce({ id: 'user-id', email: 'User@Example.com' })
    passwordHasher.hash.mockResolvedValueOnce('encoded-password-hash')
    const useCase = new CreateUserUseCase(repository as never, passwordHasher as never)

    await expect(useCase.execute({ email: ' User@Example.com ', password: 'uma frase realmente segura' })).resolves.toEqual({
      id: 'user-id',
      email: 'User@Example.com',
    })
    expect(repository.createUser).toHaveBeenCalledWith({
      email: 'User@Example.com',
      normalizedEmail: 'user@example.com',
      passwordHash: 'encoded-password-hash',
    })
  })
})
