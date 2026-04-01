import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

import { RegisterUseCase } from './register-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakePlansGateway } from 'test/ports/fake-plans-gateway'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { User } from '../../domain/entities/user'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let encrypter: FakeEncrypter
let plansGateway: FakePlansGateway
let sut: RegisterUseCase

describe('RegisterUseCase', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()
    encrypter = new FakeEncrypter()
    plansGateway = new FakePlansGateway()

    sut = new RegisterUseCase(
      usersRepository,
      hasher,
      encrypter,
      refreshTokensRepository,
      plansGateway,
    )
  })

  it('should register a user successfully', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.user).toBeInstanceOf(User)
      expect(result.value.user.name).toBe('João Silva')
      expect(result.value.user.email).toBe('joao@email.com')
      expect(result.value.accessToken).toBeDefined()
      expect(result.value.refreshToken).toBeDefined()
    }

    expect(usersRepository.items).toHaveLength(1)
    expect(refreshTokensRepository.items).toHaveLength(1)
  })

  it('should return error when email already exists', async () => {
    await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    const result = await sut.execute({
      name: 'João Outro',
      email: 'joao@email.com',
      password: '87654321',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should hash the password before saving', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)

    const savedUser = usersRepository.items[0]
    expect(savedUser.passwordHash).toBe('12345678-hashed')
    expect(savedUser.passwordHash).not.toBe('12345678')
  })

  it('should assign the Básico plan to the user', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)

    const savedUser = usersRepository.items[0]
    expect(savedUser.planId).toBe('plan-basico-id')
  })

  it('should return error when password has less than 8 characters', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '1234567',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should not create a default profile (responsibility of controller/event)', async () => {
    await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    // O use case só cria o user, não o perfil
    // Perfil é responsabilidade do controller ou domain event
    expect(usersRepository.items).toHaveLength(1)
  })

  it('should store refresh token hash in the repository', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      const rawToken = result.value.refreshToken
      const expectedHash = createHash('sha256')
        .update(rawToken)
        .digest('hex')

      const storedToken = refreshTokensRepository.items[0]
      expect(storedToken.tokenHash).toBe(expectedHash)
      expect(storedToken.family).toBeDefined()
      expect(storedToken.revokedAt).toBeNull()
    }
  })
})
