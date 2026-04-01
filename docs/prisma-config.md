# WavePlay API — Configuração Prisma

## Padrão: Igual ao projeto Estuda

---

## prisma.config.ts (raiz do projeto)

```typescript
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
```

---

## prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/shared/database/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ──────────────── Identity ────────────────

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique(map: "users_email_unique")
  passwordHash String    @map("password_hash")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  planId        String?        @map("plan_id")
  plan          Plan?          @relation(fields: [planId], references: [id])
  profiles      Profile[]
  refreshTokens      RefreshToken[]
  passwordResetTokens PasswordResetToken[]
  activeStreams       ActiveStream[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash") // hash SHA-256 do token (nunca salvar em texto puro)
  family    String    // UUID que agrupa tokens da mesma cadeia de rotação
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")        // soft delete — detecta reuso de token roubado
  ipAddress String?   @map("ip_address")
  userAgent String?   @map("user_agent")
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([family])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash") // SHA-256 hash do token
  expiresAt DateTime  @map("expires_at")         // 15 minutos
  usedAt    DateTime? @map("used_at")            // single-use — null = não usado
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

// ──────────────── Plan & Subscription ────────────────

model Plan {
  id              String   @id @default(uuid())
  name            String   // "Básico", "Padrão", "Premium"
  slug            String   @unique
  priceCents      Int      @map("price_cents")
  maxProfiles     Int      @map("max_profiles")     // ex: 1, 3, 5
  maxStreams      Int      @map("max_streams")       // telas simultâneas: 1, 2, 4
  description     String?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  users           User[]

  @@map("plans")
}

// ──────────────── Active Streams (controle de telas) ────────────────

model ActiveStream {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  profileId String   @map("profile_id")
  tmdbId    Int      @map("tmdb_id")
  type      String   // 'movie' | 'series'
  startedAt DateTime @default(now()) @map("started_at")
  lastPing  DateTime @default(now()) @map("last_ping") // heartbeat do player
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  profile   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([userId, profileId])
  @@index([userId])
  @@map("active_streams")
}

// ──────────────── Profile ────────────────

model Profile {
  id        String          @id @default(uuid())
  userId    String          @map("user_id")
  name      String
  avatarUrl String?         @map("avatar_url")
  isKid     Boolean         @default(false) @map("is_kid")
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  favorites     Favorite[]
  watchlist     WatchlistItem[]
  progress      Progress[]
  history       HistoryItem[]
  activeStreams ActiveStream[]

  @@index([userId])
  @@map("profiles")
}

// ──────────────── Library ────────────────

model Favorite {
  id         String   @id @default(uuid())
  profileId  String   @map("profile_id")
  tmdbId     Int      @map("tmdb_id")
  type       String   // 'movie' | 'series'
  title      String
  posterPath   String?  @map("poster_path")
  backdropPath String?  @map("backdrop_path")
  rating       Float    @default(0)
  createdAt    DateTime @default(now())
  profile      Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tmdbId, type])
  @@index([profileId])
  @@map("favorites")
}

model WatchlistItem {
  id         String   @id @default(uuid())
  profileId  String   @map("profile_id")
  tmdbId     Int      @map("tmdb_id")
  type       String
  title      String
  posterPath   String?  @map("poster_path")
  backdropPath String?  @map("backdrop_path")
  rating       Float    @default(0)
  createdAt    DateTime @default(now())
  profile      Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tmdbId, type])
  @@index([profileId])
  @@map("watchlist_items")
}

// ──────────────── Playback ────────────────

model Progress {
  id              String   @id @default(uuid())
  profileId       String   @map("profile_id")
  tmdbId          Int      @map("tmdb_id")
  type            String
  season          Int?
  episode         Int?
  progressSeconds Int      @map("progress_seconds")
  durationSeconds Int      @map("duration_seconds")
  updatedAt       DateTime @updatedAt
  profile         Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tmdbId, type, season, episode])
  @@index([profileId])
  @@map("progress")
}

model HistoryItem {
  id              String   @id @default(uuid())
  profileId       String   @map("profile_id")
  tmdbId          Int      @map("tmdb_id")
  type            String
  title           String
  posterPath      String?  @map("poster_path")
  season          Int?
  episode         Int?
  progressSeconds Int?     @map("progress_seconds")
  durationSeconds Int?     @map("duration_seconds")
  watchedAt       DateTime @default(now()) @map("watched_at")
  profile         Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tmdbId, type, season, episode])
  @@index([profileId])
  @@index([profileId, watchedAt])
  @@map("history_items")
}
```

---

## src/shared/database/prisma.service.ts

```typescript
import { PrismaClient } from '@/shared/database/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Pool } from 'pg'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })
    const adapter = new PrismaPg(pool)
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

---

## src/shared/database/database.module.ts

```typescript
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

> Os bindings de repository (provide/useClass) ficam dentro do module de cada Bounded Context, não no DatabaseModule. O DatabaseModule apenas exporta o PrismaService globalmente.

---

## Padrões seguidos do Estuda

| Padrão | Descrição |
|--------|-----------|
| `output = "../src/shared/database/generated/prisma"` | Client gerado junto com o PrismaService (não em node_modules) |
| `@prisma/adapter-pg` + `pg` Pool | Driver nativo PostgreSQL (melhor performance) |
| `@map("snake_case")` | Colunas em snake_case no banco, camelCase no código |
| `@@map("table_name")` | Nomes de tabela em snake_case plural |
| `onDelete: Cascade` | Deleção em cascata nas relações dependentes |
| `@@index` | Índices nos campos de FK mais consultados |
| `@@unique` compostos | Constraint de unicidade em combinações (profileId + tmdbId + type) |
| `@default(uuid())` | IDs como UUID |
| `@updatedAt` | Atualização automática do timestamp |
