# WavePlay API — Contratos da API

Base URL: `http://localhost:3333`

Response padrão em todas as rotas:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Erro:

```json
{
  "success": false,
  "data": [],
  "error": [{ "message": "...", "path": ["campo"] }]
}
```

---

## 1. Identity (Autenticação)

### POST /auth/register

Cria conta + primeiro perfil automático + subscription (plano Básico) automaticamente no registro.

**Headers (opcional):** `X-Platform: mobile`

**Body:**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "12345678",
  "confirmPassword": "12345678"
}
```

**Response 201 (mobile — com header `X-Platform: mobile`):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "createdAt": "2026-04-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4-e5f6-..."
  },
  "error": null
}
```

**Response 201 (web — sem header `X-Platform`):**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

```
Set-Cookie: refreshToken=a1b2c3d4-e5f6-...; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=172800
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Validação (email inválido, senha < 8 chars, senhas não coincidem) |
| 409 | "Email já cadastrado" |

---

### POST /auth/login

**Headers (opcional):** `X-Platform: mobile`

**Body:**

```json
{
  "email": "joao@email.com",
  "password": "12345678"
}
```

**Response 200 (mobile — com header `X-Platform: mobile`):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "createdAt": "2026-04-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4-e5f6-..."
  },
  "error": null
}
```

**Response 200 (web — sem header `X-Platform`):**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

```
Set-Cookie: refreshToken=a1b2c3d4-e5f6-...; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=172800
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Validação |
| 401 | "Credenciais inválidas" |
| 429 | Rate limit (max 10/min por IP) |
| 429 | "Conta temporariamente bloqueada" (account lockout após 5 falhas) |

---

### POST /auth/refresh

**Mobile — Headers:** `X-Platform: mobile`

**Body (mobile):**

```json
{
  "refreshToken": "a1b2c3d4-e5f6-..."
}
```

**Web — sem body.** O browser envia o cookie automaticamente.

**Response 200 (mobile):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "novo-token-uuid-..."
  },
  "error": null
}
```

**Response 200 (web):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

```
Set-Cookie: refreshToken=novo-token-uuid-...; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=172800
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 401 | "Token inválido ou expirado" |
| 401 | "Token revogado — faça login novamente" (detecção de roubo, revoga toda a family) |
| 429 | Rate limit (max 10/min por IP) |

---

### POST /auth/logout

Revoga todos os tokens da family atual (sessão do dispositivo).

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "Sessão encerrada com sucesso"
  },
  "error": null
}
```

---

### POST /auth/logout-all

Revoga TODAS as families do usuário (logout de todos os dispositivos).

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "Todas as sessões encerradas com sucesso"
  },
  "error": null
}
```

---

### POST /auth/forgot-password

Envia email com token de reset. Sempre retorna 200 (mesmo se email não existir, por segurança).

**Body:**

```json
{
  "email": "joao@email.com"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "Se o email existir, um link de recuperação foi enviado"
  },
  "error": null
}
```

---

### POST /auth/reset-password

Valida token de reset e atualiza a senha. Revoga TODAS as families do usuário.

**Body:**

```json
{
  "token": "reset-token-uuid-...",
  "password": "novaSenha123"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "Senha alterada com sucesso"
  },
  "error": null
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Validação (senha < 8 chars) |
| 401 | "Token inválido ou expirado" |

---

### GET /account

Retorna dados da conta do usuário autenticado + assinatura ativa.

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "subscription": {
        "id": "uuid",
        "status": "active",
        "startedAt": "2026-04-01T00:00:00.000Z",
        "endsAt": null,
        "plan": {
          "id": "uuid",
          "name": "Básico",
          "slug": "basico",
          "maxProfiles": 1,
          "maxStreams": 1
        }
      }
    }
  },
  "error": null
}
```

> Se o usuário não tem assinatura ativa, `subscription` será `null`.

**Erros:**

| Status | Mensagem |
|--------|----------|
| 401 | Não autenticado |
| 404 | "Usuário não encontrado" |

---

## 2. Profiles (Perfis)

Todas as rotas exigem `Authorization: Bearer {accessToken}`.

### GET /profiles

Lista perfis do usuário autenticado.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "uuid",
        "name": "João",
        "avatarUrl": "https://...",
        "isKid": false,
        "createdAt": "2026-04-01T00:00:00.000Z"
      }
    ],
    "maxProfiles": 1
  },
  "error": null
}
```

---

### POST /profiles

**Body:**

```json
{
  "name": "Maria",
  "avatarUrl": "avatar-02",
  "isKid": false
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "uuid",
      "name": "Maria",
      "avatarUrl": "avatar-02",
      "isKid": false,
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  },
  "error": null
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Validação (nome vazio) |
| 403 | "Limite de perfis atingido para o seu plano" |

---

### PATCH /profiles/:id

**Body (parcial):**

```json
{
  "name": "Maria Clara",
  "avatarUrl": "avatar-05"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "profile": { "id": "uuid", "name": "Maria Clara", "avatarUrl": "avatar-05", "isKid": false, "createdAt": "..." }
  },
  "error": null
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 404 | "Perfil não encontrado" |

---

### DELETE /profiles/:id

**Response 200:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 403 | "Não é possível deletar o último perfil" |
| 404 | "Perfil não encontrado" |

---

## 3. Subscription (Planos & Telas)

### GET /plans

**Auth:** Pública

**Response 200:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Básico",
        "slug": "basico",
        "priceCents": 0,
        "maxProfiles": 1,
        "maxStreams": 1,
        "description": "1 perfil, 1 tela"
      },
      {
        "id": "uuid",
        "name": "Padrão",
        "slug": "padrao",
        "priceCents": 1990,
        "maxProfiles": 3,
        "maxStreams": 2,
        "description": "3 perfis, 2 telas simultâneas"
      },
      {
        "id": "uuid",
        "name": "Premium",
        "slug": "premium",
        "priceCents": 3990,
        "maxProfiles": 5,
        "maxStreams": 4,
        "description": "5 perfis, 4 telas simultâneas"
      }
    ]
  },
  "error": null
}
```

---

### POST /streams/start

Registra início de reprodução. Valida limite de telas do plano.

**Body:**

```json
{
  "profileId": "uuid",
  "tmdbId": 550,
  "type": "movie",
  "title": "Fight Club"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "streamId": "uuid"
  },
  "error": null
}
```

**Response 409 (limite de telas atingido):**

```json
{
  "success": false,
  "error": {
    "statusCode": 409,
    "code": "MAX_STREAMS_REACHED",
    "message": "Você atingiu o limite de 2 tela(s) simultânea(s) do seu plano.",
    "maxStreams": 2,
    "activeStreams": [
      {
        "streamId": "uuid",
        "profileName": "João",
        "title": "The Last of Us",
        "type": "series",
        "startedAt": "2026-04-03T20:00:00Z"
      }
    ]
  }
}
```

O frontend deve exibir a lista de streams ativas e permitir ao usuário encerrar qualquer uma via `DELETE /streams/:id`, então tentar `POST /streams/start` novamente.

**Outros erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Body inválido (profileId não-uuid, tmdbId negativo, type inválido) |
| 404 | Perfil não pertence ao usuário |

---

### PUT /streams/:id/ping

Heartbeat enviado pelo player a cada 60 segundos. Armazenado no Redis (zero queries no banco).

**Response 200:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

### DELETE /streams/:id

Player encerrado.

**Response 200:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

## 4. Catalog (Proxy TMDB)

Todas as rotas exigem `Authorization: Bearer {accessToken}`.

### GET /catalog/trending

**Query:** `?page=1`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 550,
        "title": "Clube da Luta",
        "overview": "Um homem deprimido que sofre de insônia...",
        "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
        "backdropPath": "/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
        "rating": 8.4,
        "type": "movie",
        "releaseDate": "1999-10-15"
      }
    ],
    "page": 1,
    "totalPages": 500
  },
  "error": null
}
```

Para séries, `title` é o nome normalizado (TMDB retorna `name` para TV). O campo `type` é `"movie"` ou `"series"`. O campo `releaseDate` é `release_date` para filmes ou `first_air_date` para séries.

---

### GET /catalog/movies/:id

**Response 200:**

```json
{
  "success": true,
  "data": {
    "movie": {
      "id": 550,
      "title": "Clube da Luta",
      "overview": "Um homem deprimido que sofre de insônia...",
      "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
      "backdropPath": "/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
      "rating": 8.4,
      "voteCount": 26000,
      "runtime": 139,
      "releaseDate": "1999-10-15",
      "genres": [{ "id": 18, "name": "Drama" }],
      "tagline": "Mischief. Mayhem. Soap.",
      "status": "Released",
      "originalLanguage": "en"
    }
  },
  "error": null
}
```

---

### GET /catalog/series/:id

**Response 200:**

```json
{
  "success": true,
  "data": {
    "series": {
      "id": 1396,
      "name": "Breaking Bad",
      "overview": "Um professor de química...",
      "posterPath": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      "backdropPath": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
      "rating": 8.9,
      "voteCount": 12000,
      "firstAirDate": "2008-01-20",
      "genres": [{ "id": 18, "name": "Drama" }],
      "tagline": "",
      "status": "Ended",
      "numberOfSeasons": 5,
      "numberOfEpisodes": 62,
      "originalLanguage": "en",
      "seasons": [
        {
          "id": 3572,
          "seasonNumber": 1,
          "name": "Temporada 1",
          "overview": "A primeira temporada de Breaking Bad...",
          "episodeCount": 7,
          "posterPath": "/...",
          "airDate": "2008-01-20"
        }
      ]
    }
  },
  "error": null
}
```

---

### GET /catalog/series/:id/seasons/:seasonNumber

**Response 200:**

```json
{
  "success": true,
  "data": {
    "episodes": [
      {
        "id": 62085,
        "name": "Pilot",
        "overview": "Walter White, um professor...",
        "episodeNumber": 1,
        "seasonNumber": 1,
        "stillPath": "/ydlY3iEN5qhyftNIGJKLB5b0bgA.jpg",
        "airDate": "2008-01-20",
        "runtime": 58,
        "voteAverage": 8.1
      }
    ]
  },
  "error": null
}
```

---

### GET /catalog/search?q={query}

**Query:** `?q=breaking&page=1`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1396,
        "title": "Breaking Bad",
        "overview": "Um professor de química...",
        "posterPath": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        "backdropPath": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
        "rating": 8.9,
        "type": "series",
        "releaseDate": "2008-01-20"
      }
    ],
    "page": 1,
    "totalPages": 1
  },
  "error": null
}
```

---

### GET /catalog/movies/popular

**Query:** `?page=1`

Response igual ao `/catalog/trending` (array de results com paginação).

---

### GET /catalog/movies/top-rated

Response igual ao `/catalog/trending`.

---

### GET /catalog/movies/now-playing

Response igual ao `/catalog/trending`.

---

### GET /catalog/movies/upcoming

Response igual ao `/catalog/trending`.

---

### GET /catalog/series/popular

Response igual ao `/catalog/trending`.

---

### GET /catalog/series/top-rated

Response igual ao `/catalog/trending`.

---

### GET /catalog/series/airing-today

Response igual ao `/catalog/trending`.

---

### GET /catalog/series/on-the-air

Response igual ao `/catalog/trending`.

---

### GET /catalog/movies/:id/similar

Filmes semelhantes. Usado no carrossel "Semelhantes" da tela de detalhe.

**Response 200:**

Response igual ao `/catalog/trending` (array de results com paginação).

---

### GET /catalog/series/:id/similar

Séries semelhantes. Usado no carrossel "Semelhantes" da tela de detalhe.

**Response 200:**

Response igual ao `/catalog/trending` (array de results com paginação, type = "series").

---

### GET /catalog/genres/movies

Lista de gêneros de filmes. Usado nos chips de filtro da tela de filmes.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "genres": [
      { "id": 28, "name": "Ação" },
      { "id": 18, "name": "Drama" },
      { "id": 35, "name": "Comédia" }
    ]
  },
  "error": null
}
```

---

### GET /catalog/genres/series

Lista de gêneros de séries. Usado nos chips de filtro da tela de séries.

**Response 200:**

Response igual ao `/catalog/genres/movies`.

---

### GET /catalog/movies/genre/:genreId

Filmes filtrados por gênero. Usado quando o usuário seleciona um chip de gênero.

**Query:** `?page=1`

**Response 200:**

Response igual ao `/catalog/trending` (array de results com paginação).

---

### GET /catalog/series/genre/:genreId

Séries filtradas por gênero.

**Query:** `?page=1`

**Response 200:**

Response igual ao `/catalog/trending` (array de results com paginação, type = "series").

---

## 5. Library (Favoritos & Watchlist)

Todas as rotas exigem `Authorization: Bearer {accessToken}`.

### GET /favorites/:profileId

**Response 200:**

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": "uuid",
        "tmdbId": 550,
        "type": "movie",
        "title": "Clube da Luta",
        "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
        "backdropPath": "/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
        "rating": 8.4,
        "createdAt": "2026-04-01T00:00:00.000Z"
      }
    ],
    "page": 1,
    "totalPages": 1
  },
  "error": null
}
```

---

### POST /favorites/:profileId

Toggle — adiciona ou remove.

**Body:**

```json
{
  "tmdbId": 550,
  "type": "movie",
  "title": "Clube da Luta",
  "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
  "backdropPath": "/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
  "rating": 8.4
}
```

**Response 200 (adicionado):**

```json
{
  "success": true,
  "data": { "added": true },
  "error": null
}
```

**Response 200 (removido):**

```json
{
  "success": true,
  "data": { "added": false },
  "error": null
}
```

---

### GET /watchlist/:profileId

Response igual ao `GET /favorites/:profileId`, mas a chave do array é `items` em vez de `favorites`.

---

### POST /watchlist/:profileId

Body e response iguais ao `POST /favorites/:profileId`.

---

## 6. Playback (Progresso & Histórico)

Todas as rotas exigem `Authorization: Bearer {accessToken}`.

### PUT /progress/:profileId

Upsert — cria ou atualiza progresso.

**Body:**

```json
{
  "tmdbId": 550,
  "type": "movie",
  "progressSeconds": 3600,
  "durationSeconds": 8340
}
```

Para séries:

```json
{
  "tmdbId": 1396,
  "type": "series",
  "season": 1,
  "episode": 3,
  "progressSeconds": 1800,
  "durationSeconds": 3480
}
```

**Response 200:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

### GET /progress/:profileId/continue

Retorna conteúdos com progresso > 0% e < 90% (continue watching).

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "tmdbId": 550,
        "type": "movie",
        "progressSeconds": 3600,
        "durationSeconds": 8340,
        "updatedAt": "2026-04-01T12:00:00.000Z"
      },
      {
        "tmdbId": 1396,
        "type": "series",
        "season": 1,
        "episode": 3,
        "progressSeconds": 1800,
        "durationSeconds": 3480,
        "updatedAt": "2026-04-01T13:00:00.000Z"
      }
    ]
  },
  "error": null
}
```

---

### GET /history/:profileId

**Query:** `?page=1&limit=20`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tmdbId": 550,
        "type": "movie",
        "title": "Clube da Luta",
        "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
        "progressSeconds": 8340,
        "durationSeconds": 8340,
        "watchedAt": "2026-04-01T14:00:00.000Z"
      }
    ],
    "page": 1,
    "totalPages": 3
  },
  "error": null
}
```

---

### POST /history/:profileId

**Body:**

```json
{
  "tmdbId": 550,
  "type": "movie",
  "title": "Clube da Luta",
  "posterPath": "/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg",
  "progressSeconds": 3600,
  "durationSeconds": 8340
}
```

Para séries:

```json
{
  "tmdbId": 1396,
  "type": "series",
  "title": "Breaking Bad",
  "posterPath": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
  "season": 1,
  "episode": 3,
  "progressSeconds": 1800,
  "durationSeconds": 3480
}
```

**Response 201:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

### DELETE /history/:profileId

Limpa todo o histórico do perfil.

**Response 200:**

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

---

## Admin BC — Administração

> Todas as rotas exigem `Authorization: Bearer {accessToken}` com `role: admin` no JWT. Retorna **403** se o usuário não for admin.

### GET /admin/analytics

Dashboard com métricas do sistema. Retorna dois blocos: **overview** (snapshot atual) e **period** (filtrado por intervalo de datas). Todas as queries do gateway são executadas em paralelo (`Promise.all`) para minimizar o tempo de resposta.

**Query params (opcionais):**
- `startDate` — data início do período (ISO 8601: `YYYY-MM-DD`, default: 30 dias atrás)
- `endDate` — data fim do período (ISO 8601: `YYYY-MM-DD`, default: hoje)

**Exemplo:** `GET /admin/analytics?startDate=2024-01-01&endDate=2024-01-31`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 150,
      "totalActiveSubscriptions": 148,
      "subscriptionsByPlan": [
        { "planName": "Básico", "planSlug": "basico", "count": 80 },
        { "planName": "Padrão", "planSlug": "padrao", "count": 45 },
        { "planName": "Premium", "planSlug": "premium", "count": 23 }
      ],
      "activeStreams": 12,
      "estimatedMonthlyRevenue": 296100,
      "profileDistribution": [
        { "count": 1, "users": 80 },
        { "count": 2, "users": 45 },
        { "count": 3, "users": 25 }
      ],
      "profilesByType": { "kids": 30, "normal": 170 }
    },
    "period": {
      "registrationsByDay": [
        { "date": "2024-01-01", "count": 5 },
        { "date": "2024-01-02", "count": 8 }
      ],
      "cumulativeUsers": [
        { "date": "2024-01-01", "total": 100 },
        { "date": "2024-01-02", "total": 108 }
      ],
      "activeUsers": 92,
      "topContent": [
        { "tmdbId": 123, "title": "Breaking Bad", "type": "series", "views": 45 }
      ],
      "streamsByHour": [
        { "hour": 0, "count": 5 },
        { "hour": 20, "count": 45 }
      ],
      "totalStreamSessions": 1250,
      "avgStreamDuration": 2700
    }
  },
  "error": null
}
```

### POST /admin/users

Criar usuário com plano específico. Cria automaticamente subscription e primeiro perfil.

**Request body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "Abc12345",
  "planId": "uuid-do-plano"
}
```

- `name` — nome do usuário (string, min 1)
- `email` — email válido (string, email)
- `password` — senha (string, min 8, uppercase + lowercase + digit)
- `planId` — ID do plano para a subscription (string, uuid)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "role": "user",
      "createdAt": "2024-01-10T..."
    }
  },
  "error": null
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | Senha fraca |
| 401 | Não autenticado |
| 403 | Acesso restrito a admins |
| 404 | Plano não encontrado |
| 409 | Email já cadastrado |

---

### GET /admin/users?page=1&perPage=20&search=john

Lista paginada de usuários com filtro por nome/email.

**Query params:**
- `page` — página (default: 1)
- `perPage` — itens por página, definido pelo frontend (default: 20, max: 100)
- `search` — filtro por nome ou email (opcional)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "subscription": {
          "id": "uuid",
          "status": "active",
          "planName": "Padrão",
          "planSlug": "padrao",
          "endsAt": null
        },
        "profilesCount": 2,
        "createdAt": "2024-01-10T..."
      }
    ],
    "page": 1,
    "totalPages": 8,
    "totalItems": 150
  },
  "error": null
}
```

### GET /admin/users/:id

Detalhes completos de um usuário.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2024-01-10T...",
      "subscription": {
        "id": "uuid",
        "status": "active",
        "startedAt": "2024-01-10T...",
        "endsAt": null,
        "plan": {
          "id": "uuid",
          "name": "Padrão",
          "slug": "padrao",
          "maxProfiles": 3,
          "maxStreams": 2
        }
      },
      "profiles": [
        { "id": "uuid", "name": "John", "isKid": false },
        { "id": "uuid", "name": "Kids", "isKid": true }
      ]
    }
  },
  "error": null
}
```

### PATCH /admin/users/:id/subscription

Alterar subscription de um usuário (trocar plano, definir expiração).

**Request body:**
```json
{
  "planId": "uuid-do-novo-plano",
  "endsAt": null
}
```

- `planId` — ID do novo plano (obrigatório)
- `endsAt` — data de expiração ou `null` para indefinido (opcional)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "status": "active",
      "planId": "uuid",
      "planName": "Premium",
      "endsAt": null
    },
    "warning": null
  },
  "error": null
}
```

**Response 200 com warning (downgrade):**
```json
{
  "success": true,
  "data": {
    "subscription": { "..." : "..." },
    "warning": "Usuário tem 3 perfis mas o novo plano permite apenas 1"
  },
  "error": null
}
```

### POST /admin/plans

Criar novo plano.

**Request body:**
```json
{
  "name": "Ultra",
  "slug": "ultra",
  "priceCents": 5990,
  "maxProfiles": 8,
  "maxStreams": 6,
  "description": "Plano ultra com 8 perfis e 6 telas"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "name": "Ultra",
      "slug": "ultra",
      "priceCents": 5990,
      "maxProfiles": 8,
      "maxStreams": 6,
      "description": "Plano ultra com 8 perfis e 6 telas",
      "active": true
    }
  },
  "error": null
}
```

### PATCH /admin/plans/:id

Editar plano existente.

**Request body (parcial):**
```json
{
  "name": "Ultra Plus",
  "priceCents": 6990
}
```

**Response 200:** Mesmo formato do POST.

### PATCH /admin/plans/:id/toggle

Ativar/desativar plano.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "name": "Ultra",
      "active": false
    }
  },
  "error": null
}
```

---

## Headers obrigatórios

| Header | Valor | Quando |
|--------|-------|--------|
| `Content-Type` | `application/json` | Todas as requests com body |
| `Authorization` | `Bearer {accessToken}` | Todas exceto register, login, refresh, plans |

## Status codes

| Code | Significado |
|------|-------------|
| 200 | Sucesso |
| 201 | Criado |
| 400 | Validação (body inválido) |
| 401 | Não autenticado (token inválido/expirado) |
| 403 | Sem permissão (limite atingido, ação não permitida) |
| 404 | Recurso não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno |
