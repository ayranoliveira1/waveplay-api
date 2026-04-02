import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

import { RegisterUseCase } from './register-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakePlansGateway } from 'test/ports/fake-plans-gateway'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { PasswordMismatchError } from '../../domain/errors/password-mismatch.error'
import { User } from '../../domain/entities/user'
import { UserRegisteredEvent } from '../../domain/events/user-registered-event'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let encrypter: FakeEncrypter
let plansGateway: FakePlansGateway
let authConfig: FakeAuthConfig
let sut: RegisterUseCase

describe('RegisterUseCase', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()
    encrypter = new FakeEncrypter()
    plansGateway = new FakePlansGateway()
    authConfig = new FakeAuthConfig()

    sut = new RegisterUseCase(
      usersRepository,
      hasher,
      encrypter,
      refreshTokensRepository,
      plansGateway,
      authConfig,
    )
  })

  it('should register a user successfully', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
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
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    const result = await sut.execute({
      name: 'João Outro',
      email: 'joao@email.com',
      password: 'Bcd23456',
      confirmPassword: 'Bcd23456',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should hash the password before saving', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    expect(result.isRight()).toBe(true)

    const savedUser = usersRepository.items[0]
    expect(savedUser.passwordHash).toBe('Abc12345-hashed')
    expect(savedUser.passwordHash).not.toBe('Abc12345')
  })

  it('should assign the Básico plan to the user', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
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
      confirmPassword: '1234567',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should return error when password has no uppercase letter', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'abcd1234',
      confirmPassword: 'abcd1234',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
  })

  it('should return error when password has no lowercase letter', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'ABCD1234',
      confirmPassword: 'ABCD1234',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
  })

  it('should return error when password has no number', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abcdefgh',
      confirmPassword: 'Abcdefgh',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
  })

  it('should return error when confirmPassword does not match password', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Xyz98765',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PasswordMismatchError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should emit UserRegisteredEvent when user is created', async () => {
    // Testa diretamente que User.create() sem id emite o evento
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'hash',
    })

    expect(user.domainEvents).toHaveLength(1)
    expect(user.domainEvents[0]).toBeInstanceOf(UserRegisteredEvent)

    const event = user.domainEvents[0] as UserRegisteredEvent
    expect(event.user.name).toBe('João Silva')
    expect(event.getAggregateId()).toEqual(user.id)
  })

  it('should store refresh token hash in the repository', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
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
      expect(storedToken.isRevoked()).toBe(false)
    }
  })
})
