import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

import { UserRole } from '../../domain/entities/user'
import { RegisterUseCase } from './register-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { PasswordMismatchError } from '../../domain/errors/password-mismatch.error'
import { User } from '../../domain/entities/user'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let profilesRepository: InMemoryProfilesRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let plansRepository: InMemoryPlansRepository
let hasher: FakeHasher
let encrypter: FakeEncrypter
let authConfig: FakeAuthConfig
let sut: RegisterUseCase

describe('RegisterUseCase', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    profilesRepository = new InMemoryProfilesRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    plansRepository = new InMemoryPlansRepository()

    plansRepository.items.push(
      Plan.create(
        {
          name: 'Básico',
          slug: 'basico',
          priceCents: 0,
          maxProfiles: 1,
          maxStreams: 1,
        },
        new UniqueEntityID('plan-basico-id'),
      ),
    )

    hasher = new FakeHasher()
    encrypter = new FakeEncrypter()
    authConfig = new FakeAuthConfig()

    sut = new RegisterUseCase(
      usersRepository,
      hasher,
      encrypter,
      refreshTokensRepository,
      authConfig,
      profilesRepository,
      subscriptionsRepository,
      plansRepository,
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

  it('should create user with role "user" by default', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao2@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.user.role).toBe(UserRole.USER)
    }
  })

  it('should include role in JWT payload', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao3@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      const decoded = await encrypter.verify(result.value.accessToken)
      expect(decoded).toHaveProperty('role', 'user')
    }
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

  it('should return error when password exceeds 128 characters', async () => {
    const longPassword = 'Aa1' + 'x'.repeat(126) // 129 chars, has upper+lower+digit
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: longPassword,
      confirmPassword: longPassword,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should accept password with exactly 128 characters', async () => {
    const maxPassword = 'Aa1' + 'x'.repeat(125) // 128 chars
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: maxPassword,
      confirmPassword: maxPassword,
    })

    expect(result.isRight()).toBe(true)
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

  it('should create first profile with user name after registration', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    expect(result.isRight()).toBe(true)
    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].name).toBe('João Silva')
    expect(profilesRepository.items[0].userId).toBe(
      usersRepository.items[0].id.toValue(),
    )
  })

  it('should create basico subscription after registration', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
    })

    expect(result.isRight()).toBe(true)
    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].planId).toBe('plan-basico-id')
    expect(subscriptionsRepository.items[0].status).toBe('active')
    expect(subscriptionsRepository.items[0].userId).toBe(
      usersRepository.items[0].id.toValue(),
    )
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
      const expectedHash = createHash('sha256').update(rawToken).digest('hex')

      const storedToken = refreshTokensRepository.items[0]
      expect(storedToken.tokenHash).toBe(expectedHash)
      expect(storedToken.family).toBeDefined()
      expect(storedToken.isRevoked()).toBe(false)
    }
  })
})
