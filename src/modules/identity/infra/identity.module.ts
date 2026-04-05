import { Module } from '@nestjs/common'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'

import { EnvService } from '@/shared/env/env.service'

// Strategy & Guard
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtAuthGuard } from './guards/auth.guard'

// Use cases
import { RegisterUseCase } from '../application/use-cases/register-use-case'
import { AuthenticateUseCase } from '../application/use-cases/authenticate-use-case'
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token-use-case'
import { LogoutUseCase } from '../application/use-cases/logout-use-case'
import { LogoutAllUseCase } from '../application/use-cases/logout-all-use-case'
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password-use-case'
import { ResetPasswordUseCase } from '../application/use-cases/reset-password-use-case'
import { GetAccountUseCase } from '../application/use-cases/get-account-use-case'

// Controllers
import { RegisterController } from './controllers/register.controller'
import { AuthenticateController } from './controllers/authenticate.controller'
import { RefreshTokenController } from './controllers/refresh-token.controller'
import { LogoutController } from './controllers/logout.controller'
import { LogoutAllController } from './controllers/logout-all.controller'
import { ForgotPasswordController } from './controllers/forgot-password.controller'
import { ResetPasswordController } from './controllers/reset-password.controller'
import { GetAccountController } from './controllers/get-account.controller'

// Repositories (abstract → impl)
import { UsersRepository } from '../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../domain/repositories/refresh-tokens-repository'
import { PasswordResetTokensRepository } from '../domain/repositories/password-reset-tokens-repository'
import { PrismaUsersRepository } from './repositories/prisma-users-repository'
import { PrismaRefreshTokensRepository } from './repositories/prisma-refresh-tokens-repository'
import { PrismaPasswordResetTokensRepository } from './repositories/prisma-password-reset-tokens-repository'

// Ports (abstract → impl)
import { HasherPort } from '../application/ports/hasher.port'
import { EncrypterPort } from '../application/ports/encrypter.port'
import { AuthConfigPort } from '../application/ports/auth-config.port'
import { AccountLockoutPort } from '../application/ports/account-lockout.port'
import { Argon2Hasher } from './cryptography/argon2-hasher'
import { JwtEncrypter } from './cryptography/jwt-encrypter'
import { EnvAuthConfig } from './config/env-auth-config'
import { RedisAccountLockout } from './lockout/redis-account-lockout'
import { AccountGatewayPort } from '../application/ports/account-gateway.port'
import { PrismaAccountGateway } from './gateways/prisma-account-gateway'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) =>
        ({
          secret: env.get('JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: env.get('JWT_ACCESS_EXPIRES_IN'),
          },
        }) as JwtModuleOptions,
    }),
  ],
  controllers: [
    RegisterController,
    AuthenticateController,
    RefreshTokenController,
    LogoutController,
    LogoutAllController,
    ForgotPasswordController,
    ResetPasswordController,
    GetAccountController,
  ],
  providers: [
    // Use cases
    RegisterUseCase,
    AuthenticateUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GetAccountUseCase,

    // Repositories
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    {
      provide: RefreshTokensRepository,
      useClass: PrismaRefreshTokensRepository,
    },
    {
      provide: PasswordResetTokensRepository,
      useClass: PrismaPasswordResetTokensRepository,
    },

    // Ports
    { provide: HasherPort, useClass: Argon2Hasher },
    { provide: EncrypterPort, useClass: JwtEncrypter },
    { provide: AuthConfigPort, useClass: EnvAuthConfig },
    { provide: AccountLockoutPort, useClass: RedisAccountLockout },
    { provide: AccountGatewayPort, useClass: PrismaAccountGateway },

    // Strategy
    JwtStrategy,

    // Global guard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class IdentityModule {}
