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
│   │   └── pipes/
│   │       └── zod-validation.pipe.ts   # ZodError → CustomHttpException
│   │
│   └── modules/                         # Bounded Contexts
│       │
│       ├── identity/                    # BC: Identidade & Acesso
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── user.ts
│       │   │   │   └── refresh-token.ts
│       │   │   ├── repositories/
│       │   │   │   ├── users-repository.ts
│       │   │   │   ├── refresh-tokens-repository.ts
│       │   │   │   └── password-reset-tokens-repository.ts
│       │   │   └── errors/
│       │   │       ├── invalid-credentials.error.ts
│       │   │       ├── email-already-exists.error.ts
│       │   │       ├── account-locked.error.ts
│       │   │       └── invalid-reset-token.error.ts
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   │   ├── hasher.port.ts       # Interface: hash(), compare()
│       │   │   │   └── encrypter.port.ts    # Interface: sign(), verify()
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
│       │       ├── controllers/
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
│       │       │   └── auth.guard.ts
│       │       └── decorators/
│       │           ├── get-user.decorator.ts
│       │           └── public.decorator.ts
│       │
│       ├── profile/                     # BC: Perfis (estilo Netflix)
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   └── profile.ts
│       │   │   ├── repositories/
│       │   │   │   └── profiles-repository.ts
│       │   │   └── errors/
│       │   │       └── max-profiles-reached.error.ts
│       │   ├── application/
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
│       │   │       └── search-catalog-use-case.ts
│       │   └── infra/
│       │       ├── catalog.module.ts
│       │       ├── tmdb-catalog-provider.ts
│       │       ├── catalog-cache.service.ts
│       │       ├── controllers/
│       │       │   ├── trending.controller.ts
│       │       │   ├── movie-detail.controller.ts
│       │       │   ├── series-detail.controller.ts
│       │       │   └── search.controller.ts
│       │       └── presenters/
│       │           ├── movie-presenter.ts
│       │           └── series-presenter.ts
│       │
│       ├── library/                     # BC: Biblioteca do Usuário
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── favorite.ts
│       │   │   │   └── watchlist-item.ts
│       │   │   └── repositories/
│       │   │       ├── favorites-repository.ts
│       │   │       └── watchlist-repository.ts
│       │   ├── application/
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
│       │       ├── controllers/
│       │       │   ├── toggle-favorite.controller.ts
│       │       │   ├── list-favorites.controller.ts
│       │       │   ├── toggle-watchlist.controller.ts
│       │       │   └── list-watchlist.controller.ts
│       │       └── presenters/
│       │           └── media-list-presenter.ts
│       │
│       ├── subscription/                # BC: Planos & Telas Simultâneas
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── plan.ts
│       │   │   │   └── active-stream.ts
│       │   │   ├── repositories/
│       │   │   │   ├── plans-repository.ts
│       │   │   │   └── active-streams-repository.ts
│       │   │   └── errors/
│       │   │       ├── max-profiles-reached.error.ts
│       │   │       └── max-streams-reached.error.ts
│       │   ├── application/
│       │   │   └── use-cases/
│       │   │       ├── list-plans-use-case.ts
│       │   │       ├── start-stream-use-case.ts
│       │   │       ├── ping-stream-use-case.ts
│       │   │       ├── stop-stream-use-case.ts
│       │   │       └── cleanup-expired-streams-use-case.ts
│       │   └── infra/
│       │       ├── subscription.module.ts
│       │       ├── mappers/
│       │       │   ├── prisma-plan-mapper.ts
│       │       │   └── prisma-active-stream-mapper.ts
│       │       ├── repositories/
│       │       │   ├── prisma-plans-repository.ts
│       │       │   └── prisma-active-streams-repository.ts
│       │       ├── controllers/
│       │       │   ├── list-plans.controller.ts
│       │       │   ├── start-stream.controller.ts
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
│           │   └── repositories/
│           │       ├── progress-repository.ts
│           │       └── history-repository.ts
│           ├── application/
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
│               ├── controllers/
│               │   ├── save-progress.controller.ts
│               │   ├── continue-watching.controller.ts
│               │   ├── list-history.controller.ts
│               │   └── clear-history.controller.ts
│               └── presenters/
│                   ├── progress-presenter.ts
│                   └── history-presenter.ts
```

---

## Mapa de Bounded Contexts

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐
│  Identity    │────▶│  Profile     │◀────│ Subscription  │
│  (auth/user) │     │  (perfis)    │     │ (planos/telas)│
└──────┬───────┘     └──────┬───────┘     └───────────────┘
       │                    │ profileId
       │       ┌────────────┼────────────┐
       │       ▼            ▼            ▼
       │ ┌────────────┐ ┌──────────┐ ┌──────────┐
       └▶│  Library    │ │ Playback │ │ Catalog  │
         │  (fav/watch │ │(progresso│ │(proxy    │
         │   /list)    │ │/history) │ │ TMDB)    │
         └────────────┘ └──────────┘ └──────────┘
```

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
| GET | /favorites/:profileId | library | Auth | Listar favoritos |
| POST | /favorites/:profileId | library | Auth | Toggle favorito |
| GET | /watchlist/:profileId | library | Auth | Listar watchlist |
| POST | /watchlist/:profileId | library | Auth | Toggle watchlist |
| PUT | /progress/:profileId | playback | Auth | Salvar progresso |
| GET | /progress/:profileId/continue | playback | Auth | Continue watching |
| GET | /history/:profileId | playback | Auth | Listar histórico |
| POST | /history/:profileId | playback | Auth | Adicionar ao histórico |
| DELETE | /history/:profileId | playback | Auth | Limpar histórico |

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
