# WavePlay API — Tech Stack

## Runtime & Linguagem

| Tech | Versão | Uso |
|------|--------|-----|
| Node.js | 20 LTS | Runtime |
| TypeScript | ^5.7.2 | Linguagem |
| pnpm | 10.x | Gerenciador de pacotes |

---

## Framework & Core

| Tech | Versão | Uso |
|------|--------|-----|
| @nestjs/common | ^11.1.11 | Módulos, decorators, pipes, guards, filters |
| @nestjs/core | ^11.1.11 | Core do NestJS |
| @nestjs/platform-express | ^11.1.11 | HTTP adapter (Express) |
| @nestjs/config | ^4.0.0 | Variáveis de ambiente |
| @nestjs/throttler | ^6.5.0 | Rate limiting |

---

## Banco de Dados

| Tech | Versão | Uso |
|------|--------|-----|
| PostgreSQL | 17 | Banco relacional principal |
| @prisma/client | ^7.2.0 | ORM type-safe |
| prisma | ^7.2.0 | CLI de migrations e geração |
| @prisma/adapter-pg | ^7.2.0 | Adapter PostgreSQL para Prisma |
| pg | ^8.16.3 | Driver PostgreSQL nativo |
| uuidv7 | ^1.2.1 | Geração de UUID v7 (usado no UniqueEntityID) |

---

## Autenticação & Segurança

| Tech | Versão | Uso |
|------|--------|-----|
| @nestjs/jwt | ^11.x | Geração e verificação de JWT (access + refresh tokens) |
| @nestjs/passport | ^11.x | Integração com estratégias de autenticação |
| passport-jwt | ^4.x | Estratégia JWT para Passport |
| argon2 | ^0.44.0 | Hash de senhas (Argon2id — vencedor da Password Hashing Competition) |
| helmet | ^8.x | Headers HTTP de segurança |

---

## Validação

| Tech | Versão | Uso |
|------|--------|-----|
| zod | ^3.25.76 | Validação de schemas (DTOs, env vars) |

---

## Cache

| Tech | Versão | Uso |
|------|--------|-----|
| Redis | 7 | Cache principal (catálogo TMDB, sessões), heartbeat de streams ativas (sorted set por userId), account lockout |
| ioredis | ^5.10.0 | Client Redis para Node.js |
| @nestjs/cache-manager | ^3.x | Abstração de cache do NestJS |
| cache-manager-ioredis-yet | ^2.x | Adapter Redis para cache-manager |

---

## HTTP Client

| Tech | Versão | Uso |
|------|--------|-----|
| axios | ^1.13.4 | Requests para API do TMDB (proxy do catálogo) |

---

## Testes

| Tech | Versão | Uso |
|------|--------|-----|
| vitest | ^4.0.18 | Test runner |
| @nestjs/testing | ^11.1.11 | Utilitários de teste do NestJS |
| @faker-js/faker | ^10.3.0 | Dados fake para testes |
| supertest | ^7.x | Testes HTTP (integration + e2e) |

### Estratégia em 3 camadas

| Camada | Pattern | Comando | O que valida | Infra |
|---|---|---|---|---|
| **Unit** | `*.spec.ts` em `application/use-cases/` | `pnpm test` | Lógica do use case isoladamente | Fakes in-memory, sem NestJS DI |
| **Controller integration** | `*.controller.spec.ts` em `infra/controllers/` | `pnpm test` | HTTP + pipes Zod + guards + filters + presenters + roteamento | `Test.createTestingModule` mínimo com `InMemory*Repository` e `FakeAuthGuard`, sem Postgres/Redis |
| **E2E** | `*.e2e-spec.ts` em `test/e2e/` | `pnpm test:e2e` | Stack completa (AppModule, cross-BC, DB real) | Postgres (schema isolado por arquivo), Redis real, `FakeEmailSender` |

**Regra prática:** toda feature nova entrega as 3 camadas quando expõe endpoint HTTP. Unit tests ficam junto com o use case; controller specs ficam junto com o controller; E2E vão no arquivo `test/e2e/<bc>.e2e-spec.ts` do bounded context. `pnpm test` roda unit + controller integration (mesmo `vitest.config.ts`); `pnpm test:e2e` usa `vitest.config.e2e.ts` com setup global de Postgres/Redis.

---

## Dev & Tooling

| Tech | Versão | Uso |
|------|--------|-----|
| @nestjs/cli | ^11.0.5 | CLI do NestJS (build, generate) |
| @nestjs/schematics | ^11.0.2 | Geradores de código |
| @swc/core | ^1.15.11 | Compilador rápido (substitui tsc no build) |
| unplugin-swc | ^1.5.9 | Plugin SWC para Vitest |
| vite-tsconfig-paths | ^6.0.5 | Path aliases (@/) no Vitest |
| eslint | ^9.x | Linting |
| prettier | ^3.x | Formatação de código |
| ts-node | ^10.9.2 | Execução TS (CLI, seeds) |
| dotenv | ^17.2.3 | Carregamento de .env |

---

## Deploy & Infra

| Tech | Uso |
|------|-----|
| Docker | Containerização do app + PostgreSQL + Redis |
| docker-compose | Orquestração local (api + db + redis) |

---

## Dependências do package.json

### Produção

```json
{
  "@nestjs/common": "^11.1.11",
  "@nestjs/core": "^11.1.11",
  "@nestjs/platform-express": "^11.1.11",
  "@nestjs/config": "^4.0.0",
  "@nestjs/jwt": "^11.x",
  "@nestjs/passport": "^11.x",
  "@nestjs/throttler": "^6.5.0",
  "@nestjs/cache-manager": "^3.x",
  "@prisma/client": "^7.2.0",
  "@prisma/adapter-pg": "^7.2.0",
  "pg": "^8.16.3",
  "passport": "^0.7.x",
  "passport-jwt": "^4.x",
  "argon2": "^0.44.0",
  "zod": "^3.25.76",
  "axios": "^1.13.4",
  "helmet": "^8.x",
  "ioredis": "^5.10.0",
  "cache-manager": "^6.x",
  "cache-manager-ioredis-yet": "^2.x",
  "dotenv": "^17.2.3",
  "reflect-metadata": "^0.2.2",
  "rxjs": "^7.8.1",
  "uuidv7": "^1.2.1"
}
```

### Desenvolvimento

```json
{
  "prisma": "^7.2.0",
  "typescript": "^5.7.2",
  "vitest": "^4.0.18",
  "@nestjs/cli": "^11.0.5",
  "@nestjs/schematics": "^11.0.2",
  "@nestjs/testing": "^11.1.11",
  "@swc/core": "^1.15.11",
  "unplugin-swc": "^1.5.9",
  "vite-tsconfig-paths": "^6.0.5",
  "@faker-js/faker": "^10.3.0",
  "supertest": "^7.x",
  "eslint": "^9.x",
  "prettier": "^3.x",
  "ts-node": "^10.9.2",
  "@types/node": "^22.10.2",
  "@types/express": "^5.0.0",
  "@types/pg": "^8.16.0",
  "@types/passport-jwt": "^4.x",
  "@types/supertest": "^6.x"
}
```

---

## Variáveis de Ambiente

```env
# App
PORT=3333
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/waveplay

# JWT
JWT_SECRET=sua-chave-secreta-forte
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=48h

# TMDB (proxy)
TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...
TMDB_BASE_URL=https://api.themoviedb.org/3

# Redis
REDIS_URL=redis://localhost:6379
```
