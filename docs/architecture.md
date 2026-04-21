# WavePlay API — Arquitetura Backend

## Stack

- **Runtime:** Node.js
- **Framework:** NestJS
- **ORM:** Prisma
- **Banco:** PostgreSQL
- **Validação:** Zod
- **Auth:** JWT (access + refresh token) com argon2
- **Padrão:** DDD com core reutilizado do projeto Estuda

---

## Estrutura de Pastas

```
waveplay-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── core/                            # Kernel DDD (do Estuda)
│   │   ├── either.ts                    # Left (erro) / Right (sucesso)
│   │   ├── entities/
│   │   │   ├── entity.ts               # Classe base com ID genérico
│   │   │   ├── aggregate-root.ts       # Extends Entity + domain events
│   │   │   ├── unique-entity-id.ts     # UUID wrapper
│   │   │   ├── unique-code.ts          # Gerador de códigos alfanuméricos
│   │   │   ├── value-object.ts         # Classe base para Value Objects
│   │   │   └── watched-list.ts         # Lista que rastreia new/removed items
│   │   ├── events/
│   │   │   ├── domain-event.ts         # Interface: ocurredAt + getAggregateId()
│   │   │   ├── domain-events.ts        # Registry: register, dispatch, markForDispatch
│   │   │   └── event-handler.ts        # Interface: setupSubscriptions()
│   │   ├── errors/
│   │   │   ├── use-case-error.ts       # Erro base: statusCode + errors[]
│   │   │   └── errors/
│   │   │       ├── not-allowed-error.ts       # 403
│   │   │       ├── resource-not-found-error.ts # 404
│   │   │       └── unexpected-error.ts         # 500
│   │   └── types/
│   │       └── optional.ts             # Utility: torna campos opcionais
│   │
│   ├── shared/                          # Infraestrutura compartilhada
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   └── database.module.ts
│   │   ├── env/
│   │   │   ├── env.ts                  # Schema Zod das env vars
│   │   │   ├── env.service.ts
│   │   │   └── env.module.ts
│   │   ├── filters/
│   │   │   └── nest-exception-filter.ts # Catch global → { success, data, error }
│   │   ├── http/
│   │   │   ├── response-type.ts         # Interface HttpResponse<T, E>
│   │   │   └── custom-http.exception.ts # UseCaseError → HttpException
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts   # ZodError → CustomHttpException
│   │   ├── redis/
│   │   │   └── redis.module.ts          # @Global() módulo que provê ioredis client
│   │   └── email/
│   │       ├── email-sender.port.ts     # Port abstrato: sendEmail({ to, subject, body })
│   │       ├── nodemailer-email-sender.ts # Implementação Gmail OAuth2 (Nodemailer + googleapis)
│   │       └── email.module.ts          # @Global() módulo que provê EmailSenderPort
│   │
│   └── modules/                         # Bounded Contexts
│       │
│       ├── identity/                    # BC: Identidade & Acesso
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── user.ts          # AggregateRoot
│       │   │   │   ├── refresh-token.ts
│       │   │   │   └── password-reset-token.ts
│       │   │   ├── repositories/
│       │   │   │   ├── users-repository.ts
│       │   │   │   ├── refresh-tokens-repository.ts
│       │   │   │   └── password-reset-tokens-repository.ts
│       │   │   └── errors/
│       │   │       ├── invalid-credentials.error.ts
│       │   │       ├── email-already-exists.error.ts
│       │   │       ├── account-locked.error.ts
│       │   │       ├── invalid-reset-token.error.ts
│       │   │       ├── weak-password.error.ts
│       │   │       ├── password-mismatch.error.ts
│       │   │       ├── invalid-refresh-token.error.ts
│       │   │       └── token-theft-detected.error.ts
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   │   ├── hasher.port.ts       # Interface: hash(), compare()
│       │   │   │   ├── encrypter.port.ts    # Interface: sign(), verify()
│       │   │   │   ├── auth-config.port.ts  # Interface: getAccessTokenExpiresIn(), getRefreshTokenExpiresInMs(), getFrontendUrl()
│   │   │   └── account-lockout.port.ts  # Interface: isLocked(), incrementFailures(), resetFailures()
│       │   │   ├── emails/
│       │   │   │   └── password-reset-email.ts  # Template HTML para email de reset de senha
│       │   │   └── use-cases/
│       │   │       ├── register-use-case.ts
│       │   │       ├── authenticate-use-case.ts
│       │   │       ├── refresh-token-use-case.ts
│       │   │       ├── logout-use-case.ts
│       │   │       ├── logout-all-use-case.ts
│       │   │       ├── forgot-password-use-case.ts
│       │   │       └── reset-password-use-case.ts
│       │   └── infra/
│       │       ├── identity.module.ts
│       │       ├── config/
│       │       │   └── env-auth-config.ts   # AuthConfigPort ← EnvService
│       │       ├── cryptography/
│       │       │   ├── argon2-hasher.ts
│       │       │   └── jwt-encrypter.ts
│       │       ├── mappers/
│       │       │   ├── prisma-user-mapper.ts
│       │       │   ├── prisma-refresh-token-mapper.ts
│       │       │   └── prisma-password-reset-token-mapper.ts
│       │       ├── repositories/
│       │       │   ├── prisma-users-repository.ts
│       │       │   ├── prisma-refresh-tokens-repository.ts
│       │       │   └── prisma-password-reset-tokens-repository.ts
│       │       ├── strategies/
│       │       │   └── jwt.strategy.ts      # Passport JWT: extrai sub + family do token
│       │       ├── lockout/
│       │       │   └── redis-account-lockout.ts  # AccountLockoutPort ← Redis
│       │       ├── controllers/
│       │       │   ├── platform-utils.ts    # isMobile(), setRefreshTokenCookie()
│       │       │   ├── register.controller.ts
│       │       │   ├── authenticate.controller.ts
│       │       │   ├── refresh-token.controller.ts
│       │       │   ├── logout.controller.ts
│       │       │   ├── logout-all.controller.ts
│       │       │   ├── forgot-password.controller.ts
│       │       │   └── reset-password.controller.ts
│       │       ├── presenters/
│       │       │   └── user-presenter.ts
│       │       ├── guards/
│       │       │   └── auth.guard.ts        # JwtAuthGuard global com @Public() exemption
│       │       └── decorators/
│       │           ├── get-user.decorator.ts  # @GetUser() extrai { userId, family } do JWT
│       │           └── public.decorator.ts
│       │
│       ├── profile/                     # BC: Perfis (estilo Netflix)
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   └── profile.ts
│       │   │   ├── repositories/
│       │   │   │   └── profiles-repository.ts
│       │   │   └── errors/
│       │   │       ├── max-profiles-reached.error.ts
│       │   │       ├── profile-not-found.error.ts
│       │   │       └── last-profile.error.ts
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   │   └── user-plan-gateway.port.ts  # Interface: getMaxProfiles() — cross-BC query
│       │   │   └── use-cases/
│       │   │       ├── create-profile-use-case.ts
│       │   │       ├── list-profiles-use-case.ts
│       │   │       ├── update-profile-use-case.ts
│       │   │       └── delete-profile-use-case.ts
│       │   └── infra/
│       │       ├── profile.module.ts
│       │       ├── mappers/
│       │       │   └── prisma-profile-mapper.ts
│       │       ├── repositories/
│       │       │   └── prisma-profiles-repository.ts
│       │       ├── gateways/
│       │       │   └── prisma-user-plan-gateway.ts  # UserPlanGatewayPort ← Prisma (cross-BC query)
│       │       ├── controllers/
│       │       │   ├── create-profile.controller.ts
│       │       │   ├── list-profiles.controller.ts
│       │       │   ├── update-profile.controller.ts
│       │       │   └── delete-profile.controller.ts
│       │       └── presenters/
│       │           └── profile-presenter.ts
│       │
│       ├── catalog/                     # BC: Catálogo (proxy TMDB)
│       │   ├── domain/
│       │   │   └── ports/
│       │   │       └── catalog-provider.port.ts
│       │   ├── application/
│       │   │   └── use-cases/
│       │   │       ├── get-trending-use-case.ts
│       │   │       ├── get-movie-detail-use-case.ts
│       │   │       ├── get-series-detail-use-case.ts
│       │   │       ├── search-catalog-use-case.ts
│       │   │       ├── get-season-episodes-use-case.ts
│       │   │       ├── get-similar-movies-use-case.ts
│       │   │       ├── get-similar-series-use-case.ts
│       │   │       ├── get-movies-by-genre-use-case.ts
│       │   │       ├── get-series-by-genre-use-case.ts
│       │   │       ├── get-movie-genres-use-case.ts
│       │   │       ├── get-series-genres-use-case.ts
│       │   │       ├── get-popular-movies-use-case.ts
│       │   │       ├── get-top-rated-movies-use-case.ts
│       │   │       ├── get-now-playing-movies-use-case.ts
│       │   │       ├── get-upcoming-movies-use-case.ts
│       │   │       ├── get-popular-series-use-case.ts
│       │   │       ├── get-top-rated-series-use-case.ts
│       │   │       ├── get-airing-today-series-use-case.ts
│       │   │       └── get-on-the-air-series-use-case.ts
│       │   └── infra/
│       │       ├── catalog.module.ts
│       │       ├── tmdb-catalog-provider.ts
│       │       ├── catalog-cache.service.ts
│       │       ├── controllers/
│       │       │   ├── trending.controller.ts
│       │       │   ├── search.controller.ts
│       │       │   ├── movie-detail.controller.ts
│       │       │   ├── series-detail.controller.ts
│       │       │   ├── season-episodes.controller.ts
│       │       │   ├── popular-movies.controller.ts
│       │       │   ├── top-rated-movies.controller.ts
│       │       │   ├── now-playing-movies.controller.ts
│       │       │   ├── upcoming-movies.controller.ts
│       │       │   ├── popular-series.controller.ts
│       │       │   ├── top-rated-series.controller.ts
│       │       │   ├── airing-today-series.controller.ts
│       │       │   ├── on-the-air-series.controller.ts
│       │       │   ├── similar-movies.controller.ts
│       │       │   ├── similar-series.controller.ts
│       │       │   ├── movie-genres.controller.ts
│       │       │   ├── series-genres.controller.ts
│       │       │   ├── movies-by-genre.controller.ts
│       │       │   └── series-by-genre.controller.ts
│       │       └── presenters/
│       │           ├── movie-presenter.ts
│       │           ├── series-presenter.ts
│       │           ├── search-presenter.ts
│       │           └── genre-presenter.ts
│       │
│       ├── library/                     # BC: Biblioteca do Usuário
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── favorite.ts
│       │   │   │   └── watchlist-item.ts
│       │   │   ├── repositories/
│       │   │   │   ├── favorites-repository.ts
│       │   │   │   └── watchlist-repository.ts
│       │   │   └── errors/
│       │   │       └── profile-not-found.error.ts
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   │   └── profile-ownership-gateway.port.ts  # Interface: validateOwnership() — cross-BC query
│       │   │   └── use-cases/
│       │   │       ├── toggle-favorite-use-case.ts
│       │   │       ├── list-favorites-use-case.ts
│       │   │       ├── toggle-watchlist-use-case.ts
│       │   │       └── list-watchlist-use-case.ts
│       │   └── infra/
│       │       ├── library.module.ts
│       │       ├── mappers/
│       │       │   ├── prisma-favorite-mapper.ts
│       │       │   └── prisma-watchlist-mapper.ts
│       │       ├── repositories/
│       │       │   ├── prisma-favorites-repository.ts
│       │       │   └── prisma-watchlist-repository.ts
│       │       ├── gateways/
│       │       │   └── prisma-profile-ownership-gateway.ts  # ProfileOwnershipGatewayPort ← Prisma
│       │       ├── controllers/
│       │       │   ├── toggle-favorite.controller.ts
│       │       │   ├── list-favorites.controller.ts
│       │       │   ├── toggle-watchlist.controller.ts
│       │       │   └── list-watchlist.controller.ts
│       │       └── presenters/
│       │           └── media-list-presenter.ts
│       │
│       ├── subscription/                # BC: Planos, Assinaturas & Telas Simultâneas
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── plan.ts
│       │   │   │   ├── subscription.ts
│       │   │   │   ├── active-stream.ts
│       │   │   │   └── stream-session.ts     # Histórico de streams finalizadas (append-only)
│       │   │   ├── constants/
│       │   │   │   └── stream-timeout.ts          # STREAM_TIMEOUT_MS = 2min (constante compartilhada)
│       │   │   ├── repositories/
│       │   │   │   ├── plans-repository.ts
│       │   │   │   ├── subscriptions-repository.ts
│       │   │   │   ├── active-streams-repository.ts
│       │   │   │   └── stream-sessions-repository.ts
│       │   │   └── errors/
│       │   │       ├── max-profiles-reached.error.ts
│       │   │       ├── max-streams-reached.error.ts
│       │   │       └── stream-not-found.error.ts
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   │   └── profile-ownership-gateway.port.ts  # Interface: validateOwnership() — cross-BC query
│       │   │   └── use-cases/
│       │   │       ├── list-plans-use-case.ts
│       │   │       ├── start-stream-use-case.ts
│       │   │       ├── ping-stream-use-case.ts   # Ping a cada 60s — Redis (zero banco)
│       │   │       ├── stop-stream-use-case.ts
│       │   │       └── cleanup-expired-streams-use-case.ts
│       │   └── infra/
│       │       ├── subscription.module.ts
│       │       ├── mappers/
│       │       │   ├── prisma-plan-mapper.ts
│       │       │   ├── prisma-subscription-mapper.ts
│       │       │   ├── prisma-active-stream-mapper.ts
│       │       │   └── prisma-stream-session-mapper.ts
│       │       ├── repositories/
│       │       │   ├── prisma-plans-repository.ts
│       │       │   ├── prisma-subscriptions-repository.ts
│       │       │   ├── prisma-active-streams-repository.ts
│       │       │   └── prisma-stream-sessions-repository.ts
│       │       ├── gateways/
│       │       │   └── prisma-profile-ownership-gateway.ts  # ProfileOwnershipGatewayPort ← Prisma (cross-BC query)
│       │       ├── controllers/
│       │       │   ├── list-plans.controller.ts
│       │       │   ├── start-stream.controller.ts    # 409 com lista de streams ativas quando limite atingido
│       │       │   ├── ping-stream.controller.ts
│       │       │   └── stop-stream.controller.ts
│       │       └── presenters/
│       │           └── plan-presenter.ts
│       │
│       └── playback/                    # BC: Reprodução & Histórico
│           ├── domain/
│           │   ├── entities/
│           │   │   ├── progress.ts
│           │   │   └── history-item.ts
│           │   ├── repositories/
│           │   │   ├── progress-repository.ts
│           │   │   └── history-repository.ts
│           │   └── errors/
│           │       └── profile-not-found.error.ts
│           ├── application/
│           │   ├── ports/
│           │   │   └── profile-ownership-gateway.port.ts  # Interface: validateOwnership() — cross-BC query
│           │   └── use-cases/
│           │       ├── save-progress-use-case.ts
│           │       ├── get-continue-watching-use-case.ts
│           │       ├── add-to-history-use-case.ts
│           │       ├── list-history-use-case.ts
│           │       └── clear-history-use-case.ts
│           └── infra/
│               ├── playback.module.ts
│               ├── mappers/
│               │   ├── prisma-progress-mapper.ts
│               │   └── prisma-history-mapper.ts
│               ├── repositories/
│               │   ├── prisma-progress-repository.ts
│               │   └── prisma-history-repository.ts
│               ├── gateways/
│               │   └── prisma-profile-ownership-gateway.ts  # ProfileOwnershipGatewayPort ← Prisma
│               ├── controllers/
│               │   ├── save-progress.controller.ts
│               │   ├── continue-watching.controller.ts
│               │   ├── add-to-history.controller.ts
│               │   ├── list-history.controller.ts
│               │   └── clear-history.controller.ts
│               └── presenters/
│                   ├── progress-presenter.ts
│                   └── history-presenter.ts
│
├── admin/                        # BC: Administração
│   ├── domain/
│   │   └── errors/
│   │       ├── user-not-found.error.ts
│   │       ├── plan-not-found.error.ts
│   │       ├── cannot-deactivate-admin.error.ts
│   │       ├── cannot-delete-admin.error.ts
│   │       ├── user-still-active.error.ts
│   │       ├── user-deactivated.error.ts
│   │       ├── invalid-subscription-end-date.error.ts
│   │       └── plan-has-subscriptions.error.ts
│   ├── application/
│   │   ├── ports/
│   │   │   ├── admin-analytics-gateway.port.ts
│   │   │   └── admin-user-gateway.port.ts
│   │   └── use-cases/
│   │       ├── get-dashboard-analytics-use-case.ts
│   │       ├── list-users-use-case.ts
│   │       ├── get-user-detail-use-case.ts
│   │       ├── admin-create-user-use-case.ts           # aceita endsAt
│   │       ├── admin-update-user-use-case.ts           # novo (name/email)
│   │       ├── deactivate-user-use-case.ts             # novo (soft delete)
│   │       ├── activate-user-use-case.ts               # novo
│   │       ├── delete-user-use-case.ts                 # novo (hard delete)
│   │       ├── cancel-user-subscription-use-case.ts    # novo (remover plano)
│   │       ├── update-user-subscription-use-case.ts
│   │       ├── list-admin-plans-use-case.ts            # retorna usersCount
│   │       ├── create-plan-use-case.ts
│   │       ├── update-plan-use-case.ts
│   │       ├── toggle-plan-active-use-case.ts
│   │       └── delete-plan-use-case.ts                 # novo (hard delete se vazio)
│   └── infra/
│       ├── admin.module.ts
│       ├── guards/
│       │   └── admin.guard.ts
│       ├── decorators/
│       │   └── admin.decorator.ts
│       ├── gateways/
│       │   ├── prisma-admin-analytics-gateway.ts
│       │   └── prisma-admin-user-gateway.ts
│       ├── controllers/
│       │   ├── dashboard-analytics.controller.ts
│       │   ├── list-users.controller.ts
│       │   ├── get-user-detail.controller.ts
│       │   ├── admin-create-user.controller.ts
│       │   ├── admin-update-user.controller.ts         # novo
│       │   ├── deactivate-user.controller.ts           # novo
│       │   ├── activate-user.controller.ts             # novo
│       │   ├── delete-user.controller.ts               # novo
│       │   ├── cancel-user-subscription.controller.ts  # novo
│       │   ├── update-user-subscription.controller.ts
│       │   ├── list-admin-plans.controller.ts
│       │   ├── create-plan.controller.ts
│       │   ├── update-plan.controller.ts
│       │   ├── toggle-plan-active.controller.ts
│       │   └── delete-plan.controller.ts               # novo
│       └── presenters/
│           ├── analytics-presenter.ts
│           ├── admin-user-presenter.ts                 # expõe active + subscription.endsAt
│           ├── admin-subscription-presenter.ts
│           └── admin-plan-presenter.ts                 # expõe usersCount
```

---

## Mapa de Bounded Contexts

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐
│  Identity    │────▶│  Profile     │◀────│ Subscription  │
│  (auth/user) │     │  (perfis)    │     │ (planos/telas)│
└──────┬───────┘     └──────┬───────┘     └───────┬───────┘
       │                    │ profileId           │
       │       ┌────────────┼────────────┐        │
       │       ▼            ▼            ▼        │
       │ ┌────────────┐ ┌──────────┐ ┌──────────┐│
       └▶│  Library    │ │ Playback │ │ Catalog  ││
         │  (fav/watch │ │(progresso│ │(proxy    ││
         │   /list)    │ │/history) │ │ TMDB)    ││
         └────────────┘ └──────────┘ └──────────┘│
                                                  │
       ┌──────────────────────────────────────────┘
       │
       ▼
 ┌──────────────┐
 │    Admin      │  Protegido por AdminGuard (role=admin)
 │ (analytics/   │  Lê via AnalyticsGateway: Identity, Subscription,
 │  gestão)      │    Profile, Library, Playback, Streams
 │               │  Lê via UserGateway: Identity, Subscription, Profile
 └──────────────┘
```

### Comunicação entre Bounded Contexts

- **Orquestração no RegisterUseCase:** O Identity BC cria perfil e subscription diretamente no `RegisterUseCase`, usando repositórios importados dos BCs Profile e Subscription via módulos NestJS. A criação é síncrona e explícita — sem domain events.
- **Gateways cross-BC:** O Profile BC consulta dados do plano do usuário via `UserPlanGatewayPort` → `PrismaUserPlanGateway` (acessa `subscription.plan.maxProfiles` pela subscription ativa). Segue o padrão Port/Adapter para evitar acoplamento direto.
- **Gateways do Admin BC:** O Admin BC não tem repositórios próprios. Ele lê dados dos outros BCs via dois gateways Port/Adapter:
  - `AnalyticsGatewayPort` → `PrismaAnalyticsGateway` — consolida snapshot de usuários, subscriptions, perfis, streams ativas e histórico para o endpoint `GET /admin/dashboard/analytics`.
  - `UserGatewayPort` → `PrismaUserGateway` — consolida usuário + subscription + perfis para as telas de gestão de usuários.
  Escreve em `subscription.plan` diretamente via `PlansRepository` (reusado do Subscription BC através do `SubscriptionModule` importado) nos endpoints de criação/edição/toggle de planos.

---

## Fluxo de Dados

```
Request HTTP
    ↓
Controller (valida body com Zod via ZodValidationPipe)
    ↓
Use Case (lógica de negócio, retorna Either<Error, Success>)
    ↓
Either check:
  ├── isLeft()  → throw CustomHttpException (capturado pelo AllExceptionsFilter)
  └── isRight() → Presenter.toHTTP(entity) → HttpResponse { success, data, error }
    ↓
Response HTTP
```

---

## Padrão de Response

Todas as rotas retornam:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Em caso de erro:

```json
{
  "success": false,
  "data": [],
  "error": [
    { "message": "Credenciais inválidas.", "path": ["email"] }
  ]
}
```

---

## Autenticação

- **Register:** POST /auth/register → cria user com argon2 hash → retorna tokens
- **Login:** POST /auth/login → valida argon2 → retorna { accessToken (15min), refreshToken (48h) }
- **Refresh:** POST /auth/refresh → rotaciona refresh token (single-use)
- **Logout:** POST /auth/logout → invalida refresh token no banco
- **Logout-all:** POST /auth/logout-all → revoga todas as families do user
- **Forgot-password:** POST /auth/forgot-password → envia email com token de reset (15min)
- **Reset-password:** POST /auth/reset-password → valida token → atualiza senha → revoga todas as families
- **Guard:** JwtAuthGuard protege todas as rotas exceto @Public()
- **Storage no app:** accessToken em memória, refreshToken em expo-secure-store

---

## Fluxo de Registro

O `RegisterUseCase` orquestra diretamente a criação de perfil e subscription:

```
RegisterUseCase (Identity BC)
    ↓ cria User
    ↓ cria Subscription com plano "basico" (via SubscriptionsRepository)
    ↓ cria Profile com nome do usuário (via ProfilesRepository)
    ↓ gera tokens (accessToken + refreshToken)
```

A criação é síncrona e explícita — sem domain events. Os repositórios de Profile e Subscription são importados via módulos NestJS (`ProfileModule` e `SubscriptionModule` exportam seus repositórios).

### Infraestrutura de Domain Events (core/)

A infraestrutura de domain events existe em `core/events/` (`DomainEvent`, `DomainEvents`, `EventHandler`) e em `core/entities/aggregate-root.ts`, mas **não é utilizada atualmente**. Mantida para uso futuro caso necessário.

---

## Stream Sessions (Histórico)

Streams ativas (`ActiveStream`) são efêmeras — existem em Postgres + Redis enquanto o usuário assiste, e são removidas ao parar ou expirar (timeout 2min sem ping).

Para analytics, o sistema mantém um log histórico via `StreamSession` (append-only):

```
StartStream → cria ActiveStream (Postgres + Redis)
StopStream  → cria StreamSession (histórico) → deleta ActiveStream
Cleanup     → cria StreamSession para cada expirada → deleta ActiveStreams
```

| Tabela | Propósito | Ciclo de vida |
|--------|-----------|---------------|
| `ActiveStream` | Streams em andamento (tempo real) | Criada no play, deletada ao parar/expirar |
| `StreamSession` | Histórico de sessões finalizadas | Criada ao finalizar, nunca deletada |

`StreamSession` armazena: `userId`, `profileId`, `tmdbId`, `type`, `startedAt`, `endedAt`, `durationSeconds`.

---

## Endpoints

| Método | Rota | BC | Auth | Descrição |
|--------|------|----|------|-----------|
| POST | /auth/register | identity | Public | Criar conta |
| POST | /auth/login | identity | Public | Login |
| POST | /auth/refresh | identity | Public | Renovar tokens |
| POST | /auth/logout | identity | Auth | Invalidar refresh (family atual) |
| POST | /auth/logout-all | identity | Auth | Revogar todas as families do user |
| POST | /auth/forgot-password | identity | Public | Enviar email com token de reset |
| POST | /auth/reset-password | identity | Public | Validar token e atualizar senha |
| GET | /profiles | profile | Auth | Listar perfis do user |
| POST | /profiles | profile | Auth | Criar perfil (max 5) |
| PATCH | /profiles/:id | profile | Auth | Editar perfil |
| DELETE | /profiles/:id | profile | Auth | Remover perfil |
| GET | /plans | subscription | Public | Listar planos disponíveis |
| POST | /streams/start | subscription | Auth | Iniciar reprodução (checa limite) |
| PUT | /streams/:id/ping | subscription | Auth | Heartbeat do player (30s) |
| DELETE | /streams/:id | subscription | Auth | Parar reprodução |
| GET | /catalog/trending | catalog | Auth | Trending (proxy TMDB) |
| GET | /catalog/movies/:id | catalog | Auth | Detalhe filme |
| GET | /catalog/movies/popular | catalog | Auth | Filmes populares |
| GET | /catalog/movies/top-rated | catalog | Auth | Filmes mais bem avaliados |
| GET | /catalog/movies/now-playing | catalog | Auth | Filmes em cartaz |
| GET | /catalog/movies/upcoming | catalog | Auth | Filmes em breve |
| GET | /catalog/series/:id | catalog | Auth | Detalhe série |
| GET | /catalog/series/:id/seasons/:season | catalog | Auth | Episódios da temporada |
| GET | /catalog/series/popular | catalog | Auth | Séries populares |
| GET | /catalog/series/top-rated | catalog | Auth | Séries mais bem avaliadas |
| GET | /catalog/series/airing-today | catalog | Auth | Séries no ar hoje |
| GET | /catalog/series/on-the-air | catalog | Auth | Séries em exibição |
| GET | /catalog/search?q= | catalog | Auth | Busca |
| GET | /catalog/movies/:id/similar | catalog | Auth | Filmes semelhantes |
| GET | /catalog/series/:id/similar | catalog | Auth | Séries semelhantes |
| GET | /catalog/genres/movies | catalog | Auth | Lista gêneros de filmes |
| GET | /catalog/genres/series | catalog | Auth | Lista gêneros de séries |
| GET | /catalog/movies/genre/:genreId | catalog | Auth | Filmes por gênero |
| GET | /catalog/series/genre/:genreId | catalog | Auth | Séries por gênero |
| GET | /favorites/:profileId | library | Auth | Listar favoritos |
| POST | /favorites/:profileId | library | Auth | Toggle favorito |
| GET | /watchlist/:profileId | library | Auth | Listar watchlist |
| POST | /watchlist/:profileId | library | Auth | Toggle watchlist |
| PUT | /progress/:profileId | playback | Auth | Salvar progresso |
| GET | /progress/:profileId/continue | playback | Auth | Continue watching |
| GET | /history/:profileId | playback | Auth | Listar histórico |
| POST | /history/:profileId | playback | Auth | Adicionar ao histórico |
| DELETE | /history/:profileId | playback | Auth | Limpar histórico |
| GET | /admin/analytics | admin | Admin | Dashboard com métricas |
| GET | /admin/users | admin | Admin | Lista usuários (paginado, filtro) |
| GET | /admin/users/:id | admin | Admin | Detalhes do usuário |
| POST | /admin/users | admin | Admin | Criar usuário com plano específico (suporta `endsAt`) |
| PATCH | /admin/users/:id | admin | Admin | Editar nome/email do usuário |
| PATCH | /admin/users/:id/deactivate | admin | Admin | Desativar usuário (soft delete + revoga sessões) |
| PATCH | /admin/users/:id/activate | admin | Admin | Reativar usuário desativado |
| DELETE | /admin/users/:id | admin | Admin | Hard delete — exige `active=false` |
| PATCH | /admin/users/:id/subscription | admin | Admin | Alterar plano/endsAt do usuário |
| DELETE | /admin/users/:id/subscription | admin | Admin | Cancelar subscription (remover plano) |
| GET | /admin/plans | admin | Admin | Lista planos com `usersCount` |
| POST | /admin/plans | admin | Admin | Criar plano |
| PATCH | /admin/plans/:id | admin | Admin | Editar plano |
| PATCH | /admin/plans/:id/toggle | admin | Admin | Ativar/desativar plano |
| DELETE | /admin/plans/:id | admin | Admin | Hard delete — exige `usersCount=0` |

---

## RBAC (Role-Based Access Control)

O campo `role` no model `User` define o nível de acesso:

| Role | Descrição | Acesso |
|------|-----------|--------|
| `user` | Usuário padrão (default) | Todas as rotas Auth |
| `admin` | Administrador | Todas as rotas Auth + rotas `/admin/*` |

- O `role` é incluído no payload JWT: `{ sub, family, role }`
- `AdminGuard` valida `role === 'admin'` — retorna 403 se não for admin
- O decorator `@Admin()` aplica `AdminGuard` nos controllers do Admin BC
- O `user-presenter.ts` público **NÃO** expõe o campo `role` (segurança)

---

## Schema do Banco (Prisma)

> Schema completo com todos os models, constraints e índices: ver [prisma-config.md](prisma-config.md)

---

## Core do Estuda — Referência

O `core/` é copiado do projeto Estuda e contém as bases do DDD:

| Arquivo | Propósito |
|---------|-----------|
| `either.ts` | Retorno explícito Left/Right — elimina try/catch nos use cases |
| `entity.ts` | Classe base: ID (UniqueEntityID), props genérico, equals() |
| `aggregate-root.ts` | Extends Entity + gerencia domainEvents[] |
| `value-object.ts` | Classe base com equals() por JSON comparison |
| `unique-entity-id.ts` | Wrapper UUID com equals(), toString(), toValue() |
| `unique-code.ts` | Gerador de códigos alfanuméricos configurável |
| `watched-list.ts` | Lista que rastreia items novos/removidos (para aggregates) |
| `domain-event.ts` | Interface: ocurredAt + getAggregateId() |
| `domain-events.ts` | Registry estático: register(), dispatch(), markForDispatch() |
| `event-handler.ts` | Interface: setupSubscriptions() |
| `use-case-error.ts` | Erro base: statusCode + errors[] tipados |
| `not-allowed-error.ts` | Extends UseCaseError — 403 |
| `resource-not-found-error.ts` | Extends UseCaseError — 404 fixo |
| `unexpected-error.ts` | Extends UseCaseError — 500 |
| `optional.ts` | Utility type: torna campos específicos opcionais |
