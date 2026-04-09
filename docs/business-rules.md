# WavePlay API — Regras de Negócio

---

## 1. Planos e Assinaturas

### Models envolvidos: `Plan`, `Subscription`

| Regra | Descrição |
|-------|-----------|
| Todo usuário recebe uma assinatura ao registrar | Criada automaticamente no registro — o user recebe uma Subscription com plano "basico" (status: active) |
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
Register → valida confirmPassword → cria user + hash senha → cria subscription (basico) + perfil → retorna tokens
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

### Stream Sessions (Histórico)

| Regra | Descrição |
|-------|-----------|
| Registro ao finalizar | `StreamSession` é criada ao finalizar uma stream (stop manual ou cleanup de expiradas) |
| Append-only | StreamSessions são apenas inseridas, nunca atualizadas ou deletadas |
| Dados registrados | userId, profileId, tmdbId, type, startedAt, endedAt, durationSeconds |
| Duração calculada | `durationSeconds = endedAt - startedAt` (calculado no momento da criação) |
| Stop manual | `DELETE /streams/:id` → cria StreamSession antes de deletar a ActiveStream |
| Cleanup automático | Cron job busca streams expiradas → cria StreamSession para cada uma → deleta |
| Uso em analytics | StreamSessions alimentam gráficos de uso: streams por hora, duração média, total de sessões |

```
Ciclo de vida:

ActiveStream (efêmera)              StreamSession (permanente)
┌──────────────────────┐            ┌──────────────────────┐
│ POST /streams/start  │            │                      │
│ → cria ActiveStream  │            │                      │
│ + Redis ZADD         │            │                      │
│                      │            │                      │
│ PUT /streams/:id/ping│            │                      │
│ → Redis ZADD         │            │                      │
│                      │            │                      │
│ DELETE /streams/:id  │───────────→│ cria StreamSession   │
│ → deleta ActiveStream│            │ (append-only log)    │
│ + Redis ZREM         │            │                      │
└──────────────────────┘            └──────────────────────┘

Ou, se expirada:

│ Cron cleanup         │───────────→│ cria StreamSession   │
│ → deleta expiradas   │            │ para cada expirada   │
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
| Debounce em memória | App salva progresso em memória a cada 5 segundos (não a cada frame) |
| Sync periódico | App envia progresso para API a cada 5 minutos (backup contra crash) |
| Flush ao sair | App salva progresso imediatamente na API ao sair do player |
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

---

## 12. Administração (Admin BC)

### RBAC

| Regra | Descrição |
|-------|-----------|
| Campo `role` no User | `"user"` (default) ou `"admin"` |
| JWT inclui role | Payload: `{ sub, family, role }` |
| AdminGuard | Valida `role === 'admin'`, retorna 403 se não for |
| Role não exposta publicamente | `user-presenter.ts` público não inclui `role` |
| Role não aceita via body | `POST /admin/users` não aceita campo `role` — usuário criado sempre nasce com `role = 'user'`. Promoção para admin é manual via seed/DB |
| Admin padrão via seed | Criado no seed com email configurável via `.env` |

### Analytics (GET /admin/analytics)

O endpoint de analytics retorna dois blocos: **overview** (snapshot do estado atual) e **period** (dados filtrados por intervalo de datas).

#### Overview (snapshot — estado atual do sistema)

| Métrica | Descrição |
|---------|-----------|
| `totalUsers` | Total de usuários registrados |
| `totalActiveSubscriptions` | Subscriptions com `status: 'active'` |
| `subscriptionsByPlan` | Contagem agrupada por plano (apenas subscriptions ativas) |
| `activeStreams` | Streams ativas no momento (via Redis, tempo real) |
| `estimatedMonthlyRevenue` | Soma de `priceCents` de todas as subscriptions ativas |
| `profileDistribution` | Distribuição de perfis por usuário (ex: 80 users com 1 perfil, 30 com 2) |
| `profilesByType` | Contagem de perfis por tipo: `kids` vs `normal` |

#### Period (filtrado por data — startDate/endDate)

| Métrica | Descrição |
|---------|-----------|
| `registrationsByDay` | Registros de usuários agrupados por dia no período |
| `cumulativeUsers` | Total acumulado de usuários até cada dia do período |
| `activeUsers` | Usuários distintos com histórico de visualização no período |
| `topContent` | Top 10 conteúdos mais assistidos no período (via HistoryItem) |
| `streamsByHour` | Sessões de stream agrupadas por hora do dia (via StreamSession) |
| `totalStreamSessions` | Total de sessões finalizadas no período (via StreamSession) |
| `avgStreamDuration` | Duração média das sessões em segundos (via StreamSession) |

| Regra | Descrição |
|---------|-----------|
| Query params opcionais | `startDate` e `endDate` como query params (default: últimos 30 dias) |
| Formato de data | ISO 8601 (YYYY-MM-DD), validado com Zod |
| Overview não depende de datas | Sempre retorna o snapshot atual, independente dos params |
| Period depende de StreamSession | Gráficos de streams por hora, duração média e total dependem da tabela StreamSession |
| Performance | Todas as queries do gateway executam em paralelo (`Promise.all`) para minimizar tempo de resposta |
| Índices otimizados | StreamSession indexada por `startedAt` e `endedAt` para queries de período rápidas |

### Gestão de Usuários

| Regra | Descrição |
|-------|-----------|
| Criar usuário | Admin pode criar usuário com plano específico — cria user + subscription + primeiro perfil |
| Email único | Não permite criar usuário com email já existente (409) |
| Senha obrigatória | Admin define a senha inicial do usuário |
| Listar usuários | Paginado com filtro por nome/email. Frontend define `perPage` (max 100) |
| Detalhes do usuário | Retorna dados + subscription ativa + perfis |
| Alterar subscription | Admin pode trocar o plano de qualquer usuário |
| Downgrade não bloqueia perfis | Se user tem mais perfis que o novo plano permite, não deleta — apenas avisa |
| `endsAt` pode ser null | Significa subscription indefinida (sem data de expiração) |

### Gestão de Planos

| Regra | Descrição |
|-------|-----------|
| Criar plano | Nome, slug (único), preço, maxProfiles, maxStreams, descrição |
| Editar plano | Alterar nome, preço, limites, descrição |
| Slug imutável | Uma vez criado, o slug não pode ser alterado (não faz parte do PATCH). Corrigir slug errado exige criar plano novo + toggle inativo do antigo |
| Ativar/desativar plano | `plan.active` toggle. Planos inativos somem dos listings públicos e não podem ser escolhidos em novos registros/upgrades. **Subscriptions existentes continuam ativas** até expirarem naturalmente (nenhum cascade) |
| Deletar plano | **Não permitido** — integridade referencial com subscriptions existentes |
