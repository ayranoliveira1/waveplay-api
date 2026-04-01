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

Cria conta + primeiro perfil automático + plano Básico.

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
      "plan": {
        "id": "uuid",
        "name": "Básico",
        "slug": "basico",
        "maxProfiles": 1,
        "maxStreams": 1
      },
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
      "plan": {
        "id": "uuid",
        "name": "Básico",
        "slug": "basico",
        "maxProfiles": 1,
        "maxStreams": 1
      },
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
  "data": null,
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
  "data": null,
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
  "type": "movie"
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

**Erros:**

| Status | Mensagem |
|--------|----------|
| 403 | "Limite de telas simultâneas atingido. Seu plano permite X tela(s)" |

---

### PUT /streams/:id/ping

Heartbeat enviado pelo player a cada 30 segundos.

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
      "runtime": 139,
      "releaseDate": "1999-10-15",
      "genres": [{ "id": 18, "name": "Drama" }],
      "tagline": "Mischief. Mayhem. Soap.",
      "status": "Released"
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
      "firstAirDate": "2008-01-20",
      "genres": [{ "id": 18, "name": "Drama" }],
      "tagline": "",
      "status": "Ended",
      "numberOfSeasons": 5,
      "numberOfEpisodes": 62,
      "seasons": [
        {
          "id": 3572,
          "seasonNumber": 1,
          "name": "Temporada 1",
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
        "posterPath": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        "backdropPath": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
        "rating": 8.9,
        "type": "series"
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
    ]
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

Response igual ao `GET /favorites/:profileId`.

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
