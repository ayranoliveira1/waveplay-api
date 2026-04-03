# WavePlay API — Regras de Negócio

---

## 1. Planos e Assinaturas

### Models envolvidos: `Plan`, `Subscription`

| Regra | Descrição |
|-------|-----------|
| Todo usuário recebe uma assinatura ao registrar | Via domain event, o user recebe uma Subscription com plano "basico" (status: active) |
| Subscription conecta User a Plan | `User ← Subscription → Plan` (não há relação direta User→Plan) |
| Plano define limite de perfis | `plan.maxProfiles` via subscription ativa do user |
| Plano define limite de telas | `plan.maxStreams` via subscription ativa do user |
| Planos inativos não podem ser assinados | `plan.active = false` impede novas assinaturas mas não afeta quem já tem |
| Subscription tem status | `active`, `canceled`, `expired` — queries usam a subscription ativa mais recente |
| Admin pode setar subscription | Futuramente, painel admin poderá alterar a subscription de um usuário manualmente |

### Planos iniciais

| Plano | Slug | Perfis | Telas | Preço |
|-------|------|--------|-------|-------|
| Básico | basico | 1 | 1 | R$ 0 (free) |
| Padrão | padrao | 3 | 2 | R$ 19,90 |
| Premium | premium | 5 | 4 | R$ 39,90 |

---

## 2. Autenticação

### Models envolvidos: `User`, `RefreshToken`

| Regra | Descrição |
|-------|-----------|
| Email único | Não pode existir dois usuários com o mesmo email |
| Confirmação de senha | `confirmPassword` deve ser igual a `password` no registro |
| Senha forte obrigatória | Min 8 caracteres, pelo menos 1 maiúscula, 1 minúscula e 1 número. Validação no register via Zod |
| Senha salva com Argon2id | Parâmetros: memoryCost=65536 (64MB), timeCost=3, parallelism=1 |
| Access token expira em 15 minutos | JWT stateless, validado pela assinatura |
| Refresh token expira em 48 horas | Salvo como SHA-256 no banco |
| Refresh token é single-use | Ao usar, o token atual é revogado e um novo é gerado |
| Rotação por family | Cada login cria uma nova family. Refresh herda a mesma family |
| Detecção de roubo | Se um token revogado for reutilizado → revogar TODOS os tokens da family |
| Múltiplos dispositivos permitidos | Cada login cria uma sessão (family) independente |
| Account lockout | 5 tentativas falhas de login → conta bloqueada por 30min (contador em Redis com TTL) |
| Rate limit no refresh | Max 10 requests de refresh por minuto por IP |
| Transporte do refresh token | Header `X-Platform: mobile` → refresh token no body. Qualquer outro valor ou ausente → httpOnly cookie (padrão web) |
| Logout geral | POST /auth/logout-all revoga todas as families do usuário |

### Fluxo de autenticação

```
Register → valida confirmPassword → cria user + hash senha → domain event → cria subscription (basico) + perfil → retorna tokens
Login    → verifica lockout → valida email + argon2 verify → gera family → retorna tokens
Refresh  → valida hash do token → revoga atual → gera novo com mesma family
Logout   → revoga todos tokens da family
Logout-all → revoga TODAS as families do user
```

### Transporte de tokens por plataforma

```
Mobile (X-Platform: mobile):
  Response body: { accessToken, refreshToken }
  App salva refreshToken no expo-secure-store

Web (padrão, sem header):
  Response body: { accessToken }
  Response cookie: Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/auth
  Browser envia cookie automaticamente no /auth/refresh
```

### Password Reset

| Regra | Descrição |
|-------|-----------|
| Token por email | POST /auth/forgot-password envia email com token de reset |
| Token curto | Expira em 15 minutos, single-use |
| Salvo como hash | Token salvo como SHA-256 no banco (igual refresh token) |
| Reset efetivo | POST /auth/reset-password valida token → atualiza senha → revoga TODAS as families |

---

## 3. Perfis

### Models envolvidos: `Profile`, `User`, `Plan`

| Regra | Descrição |
|-------|-----------|
| Limite de perfis por plano | `COUNT(profiles) < user.plan.maxProfiles` para criar novo |
| Primeiro perfil automático | Ao registrar, cria perfil com o nome do user automaticamente |
| Nome obrigatório | Perfil precisa ter nome (min 1 caractere) |
| Perfil infantil | `isKid = true` pode futuramente filtrar conteúdo adulto |
| Deleção em cascata | Deletar perfil remove seus favoritos, watchlist, progresso e histórico |
| Perfil não pode ser deletado se for o último | User deve ter pelo menos 1 perfil |

---

## 4. Controle de Telas Simultâneas

### Models envolvidos: `ActiveStream`, `User`, `Plan`

| Regra | Descrição |
|-------|-----------|
| Limite por plano | `COUNT(active_streams WHERE lastPing > 2min atrás) < user.plan.maxStreams` |
| Heartbeat obrigatório | Player envia ping a cada 60 segundos |
| Timeout de 2 minutos | Stream sem ping há 2 minutos é considerada inativa |
| Uma stream por perfil | Cada perfil só pode ter 1 reprodução ativa (`@@unique([userId, profileId])`) |
| Limpeza automática | Cron job remove streams com lastPing > 2 minutos |
| Storage | Ping no Redis (sorted set por userId). Start/stop no PostgreSQL (atomicidade) |

### Fluxo de reprodução

```
1. App chama POST /streams/start { profileId, tmdbId, type, title }
2. Backend conta streams ativas do user (Redis: ZREMRANGEBYSCORE + ZCARD, com fallback PG $transaction)
3. Se count >= plan.maxStreams → 409 com lista de streams ativas
4. Se ok → PostgreSQL: cria/atualiza ActiveStream + Redis: ZADD → retorna streamId
5. Player chama PUT /streams/:id/ping a cada 60s → Redis ZADD (zero banco)
6. Ao sair do player → DELETE /streams/:id (PostgreSQL + Redis)
7. Se app crashar → stream expira sozinha após 2min sem ping
```

### Quando o limite é atingido

```
API retorna 409 com lista de streams ativas:
  - streamId, profileName, title, type, startedAt

App mostra: "Você atingiu o limite de X telas simultâneas do seu plano."
            + Lista de dispositivos ativos
            + Opção de encerrar qualquer um (DELETE /streams/:id)
            + Após encerrar, app tenta POST /streams/start novamente
```

### Detecção de desconexão (player externo)

```
1. Player A está assistindo (ping OK a cada 60s)
2. Player C tenta iniciar → recebe 409 com lista [A, B]
3. Usuário escolhe encerrar Player A → DELETE /streams/{streamId-A}
4. Player C tenta novamente → 201 (agora tem vaga)
5. Player A faz próximo ping (até 60s depois) → recebe 404
6. App do Player A pausa o vídeo e mostra: "Sessão encerrada por outro dispositivo"
```

---

## 5. Favoritos

### Models envolvidos: `Favorite`, `Profile`

| Regra | Descrição |
|-------|-----------|
| Vinculado ao perfil | Cada perfil tem seus próprios favoritos |
| Toggle (add/remove) | Se já é favorito, remove. Se não é, adiciona |
| Unicidade por perfil + tmdb + type | Mesmo conteúdo não pode ser favoritado duas vezes no mesmo perfil |
| Sem limite de quantidade | Usuário pode favoritar quantos quiser |

---

## 6. Watchlist (Assistir Depois)

### Models envolvidos: `WatchlistItem`, `Profile`

| Regra | Descrição |
|-------|-----------|
| Vinculado ao perfil | Cada perfil tem sua própria watchlist |
| Toggle (add/remove) | Mesmo comportamento dos favoritos |
| Unicidade por perfil + tmdb + type | Sem duplicatas |
| Sem limite de quantidade | Sem restrição |
| Independente dos favoritos | Pode estar na watchlist E nos favoritos ao mesmo tempo |

---

## 7. Progresso de Reprodução

### Models envolvidos: `Progress`, `Profile`

| Regra | Descrição |
|-------|-----------|
| Vinculado ao perfil | Cada perfil tem seu próprio progresso |
| Upsert | Se já existe progresso para o conteúdo, atualiza. Se não, cria |
| Debounce no app | App envia progresso a cada 5 segundos (não a cada frame) |
| Flush ao sair | App salva progresso imediatamente ao sair do player |
| Identificação por conteúdo | Filme: `tmdbId + type`. Série: `tmdbId + type + season + episode` |
| Continue watching | Conteúdo com progresso > 0% e < 90% aparece em "Continue Assistindo" |
| Conteúdo assistido | Progresso >= 90% da duração é considerado "assistido" |

---

## 8. Histórico

### Models envolvidos: `HistoryItem`, `Profile`

| Regra | Descrição |
|-------|-----------|
| Vinculado ao perfil | Cada perfil tem seu próprio histórico |
| Adicionado ao iniciar reprodução | Registra quando o user começa a assistir |
| Atualiza se já existe | Se assistir de novo o mesmo conteúdo, atualiza o watchedAt |
| Limite de 50 itens por perfil | Os mais antigos são removidos quando exceder |
| Limpar histórico | User pode limpar todo o histórico do perfil |
| Ordenado por data | Mais recente primeiro |

---

## 9. Catálogo (Proxy TMDB)

### Sem model — dados vêm do TMDB via proxy

| Regra | Descrição |
|-------|-----------|
| Token TMDB no backend | App nunca acessa TMDB direto. Todas as chamadas passam pela API |
| Cache Redis | Respostas do TMDB são cacheadas para reduzir latência e requests |
| TTL do cache por tipo | Trending: 1h, Detail: 24h, Search: 30min |
| Idioma pt-BR | Todas as chamadas ao TMDB usam `language=pt-BR` |
| Fallback sem cache | Se Redis estiver fora, busca direto do TMDB (sem cache) |

---

## 10. Regras Gerais

| Regra | Descrição |
|-------|-----------|
| Rate limiting | Max 10 requests por minuto por IP nos endpoints: login, refresh, forgot-password, reset-password |
| Todas as rotas protegidas | Exceto: register, login, refresh, forgot-password, reset-password |
| Ownership de perfil | Toda operação com profileId valida que `profile.userId === auth.userId` |
| Response padronizado | `{ success: boolean, data?: T, error?: E[] }` |
| Soft delete de refresh tokens | Nunca hard delete — manter para auditoria de segurança |
| Cascata nas deleções | Deletar user → deleta profiles → deleta favoritos, watchlist, progresso, histórico |
| UUIDs como ID | Todos os models usam UUID v7 (ordenável por tempo, gerado no app via `uuidv7`) |

---

## 11. Segurança

### HTTPS & Headers

| Regra | Descrição |
|-------|-----------|
| HTTPS obrigatório | Produção deve forçar HTTPS. HTTP redireciona para HTTPS |
| HSTS | Header `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| Helmet | Ativado com configuração customizada |
| CSP | `Content-Security-Policy: default-src 'self'` |
| X-Frame-Options | `DENY` — previne clickjacking |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |

### CORS

| Regra | Descrição |
|-------|-----------|
| Origens explícitas | Lista de domínios permitidos (não usar `*`) |
| Credentials | `true` — necessário para envio de cookies httpOnly |
| Methods | `GET, POST, PUT, PATCH, DELETE` |
| Allowed headers | `Authorization, Content-Type, X-Platform` |

### Token Storage por Plataforma

| Plataforma | Access Token | Refresh Token |
|------------|-------------|---------------|
| Mobile (React Native) | Memória (state/context) | `expo-secure-store` (Keychain/Keystore) |
| Web (Browser) | Memória (variável JS, nunca localStorage) | httpOnly cookie (Secure, SameSite=Strict) |

### Audit Logging

| Evento | Log |
|--------|-----|
| Login falho | IP, email tentado, timestamp |
| Account lockout | IP, email, duração do bloqueio |
| Theft detection | Family afetada, IP do request suspeito |
| Token revogado | Motivo (logout, refresh, theft), family |
| Password reset solicitado | Email, IP |
