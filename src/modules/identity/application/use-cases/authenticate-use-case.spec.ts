import { describe, it, expect, beforeEach } from 'vitest'

import { AuthenticateUseCase } from './authenticate-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAccountLockout } from 'test/ports/fake-account-lockout'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'
import { AccountLockedError } from '../../domain/errors/account-locked.error'
import { User } from '../../domain/entities/user'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let encrypter: FakeEncrypter
let accountLockout: FakeAccountLockout
let sut: AuthenticateUseCase

describe('AuthenticateUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()
    encrypter = new FakeEncrypter()
    accountLockout = new FakeAccountLockout()

    sut = new AuthenticateUseCase(
      usersRepository,
      hasher,
      encrypter,
      refreshTokensRepository,
      accountLockout,
    )

    // Cria um user padrão para os testes de login
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: '12345678-hashed',
      planId: 'plan-basico-id',
    })

    await usersRepository.create(user)
  })

  it('should authenticate successfully', async () => {
    const result = await sut.execute({
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.user).toBeInstanceOf(User)
      expect(result.value.user.email).toBe('joao@email.com')
      expect(result.value.accessToken).toBeDefined()
      expect(result.value.refreshToken).toBeDefined()
    }

    expect(refreshTokensRepository.items).toHaveLength(1)
  })

  it('should return error when email does not exist', async () => {
    const result = await sut.execute({
      email: 'inexistente@email.com',
      password: '12345678',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })

  it('should return error when password is wrong', async () => {
    const result = await sut.execute({
      email: 'joao@email.com',
      password: 'senha-errada',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })

  it('should lock account after 5 failed attempts', async () => {
    // 5 tentativas com senha errada
    for (let i = 0; i < 5; i++) {
      await sut.execute({
        email: 'joao@email.com',
        password: 'senha-errada',
      })
    }

    // 6ª tentativa — mesmo com senha correta, conta está bloqueada
    const result = await sut.execute({
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(AccountLockedError)
  })

  it('should unlock account after lockout expires (TTL reset)', async () => {
    // Bloqueia a conta
    for (let i = 0; i < 5; i++) {
      await sut.execute({
        email: 'joao@email.com',
        password: 'senha-errada',
      })
    }

    // Simula o TTL do Redis expirando (30 min)
    await accountLockout.resetFailures('joao@email.com')

    const result = await sut.execute({
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)
  })

  it('should reset failure counter after successful login', async () => {
    // 3 tentativas erradas (abaixo do limite)
    for (let i = 0; i < 3; i++) {
      await sut.execute({
        email: 'joao@email.com',
        password: 'senha-errada',
      })
    }

    // Login com sucesso reseta o contador
    const successResult = await sut.execute({
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(successResult.isRight()).toBe(true)

    // Mais 4 tentativas erradas — não deve bloquear (contador zerou)
    for (let i = 0; i < 4; i++) {
      await sut.execute({
        email: 'joao@email.com',
        password: 'senha-errada',
      })
    }

    const result = await sut.execute({
      email: 'joao@email.com',
      password: '12345678',
    })

    expect(result.isRight()).toBe(true)
  })
})
