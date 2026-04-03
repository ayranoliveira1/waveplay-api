# ADR-0002: Usar Redis para heartbeat de streams e retornar 409 com lista de streams ativas

## Status

Proposed

## Context

A rota `PUT /streams/:id/ping` é chamada a cada intervalo de tempo por cada player ativo para manter a stream como "ativa". Com o crescimento de usuários, isso gera pressão significativa no PostgreSQL:

- Com 1.000 usuários (~1.500 streams), gera ~50 req/s de ping
- Cada ping faz 2 queries no PostgreSQL: `findById` (leitura) + `UPDATE lastPing` (escrita)
- Total: ~100 queries/s só de heartbeat, fora start/stop e o resto da API
- O pool de conexões do Prisma (padrão ~5) pode se esgotar rapidamente
- Quando o limite de streams é atingido, o response 403 é genérico — não informa quais streams estão ativas, forçando o usuário a encontrar e fechar manualmente em outro dispositivo

Redis já está no stack do projeto (cache TMDB, account lockout), portanto a infraestrutura já existe.

## Decision

1. **Ping de 30s para 60s** — corta a carga pela metade. Com timeout de 2 minutos, o player ainda tem 2 chances de ping antes de expirar
2. **Mover heartbeat (ping) para Redis** — `ZADD` em sorted set por userId, zero queries no banco
3. **Manter start/stop no PostgreSQL** — atomicidade com `$transaction` preservada para prevenção de race condition
4. **Contagem de streams ativas via Redis** — `ZREMRANGEBYSCORE` + `ZCARD` no sorted set
5. **Mudar response de limite de 403 para 409** — retorna lista de streams ativas para o usuário escolher qual encerrar (estilo HBO Max / Disney+)

### Fluxos

**Start (PostgreSQL + Redis):**
```
POST /streams/start
  → Valida ownership do perfil
  → Busca subscription → plan.maxStreams
  → PostgreSQL: $transaction { count + upsert }
  → Se count >= maxStreams → 409 com lista de streams ativas
  → Se ok → Redis: ZADD streams:{userId} {timestamp} {profileId}:{streamId}
  → Retorna 201 { streamId }
```

**Ping (Redis — zero banco):**
```
PUT /streams/:id/ping
  → Valida ownership via Redis hash (stream:{id} → userId)
  → Redis: ZADD streams:{userId} {timestamp} {profileId}:{streamId}
  → Retorna 200
  → Se stream não existe → 404 (player detecta desconexão)
```

**Stop (PostgreSQL + Redis):**
```
DELETE /streams/:id
  → PostgreSQL: valida ownership + DELETE
  → Redis: ZREM streams:{userId} + DEL stream:{id}
  → Retorna 200
```

**Cleanup (Cron):**
```
  → Redis: ZREMRANGEBYSCORE streams:* -inf {threshold} (remove expirados)
  → PostgreSQL: DELETE WHERE lastPing < threshold (limpa registros antigos)
```

### Detecção de desconexão no player

O player de vídeo é externo (ExoPlayer, AVPlayer, Video.js) — não controlamos internamente. O **app ao redor do player** faz o controle:

```
App (React Native / Web)
  ├── POST /streams/start → recebe streamId → play no player externo
  ├── setInterval(60s) → PUT /streams/:id/ping
  │     ├── 200 → ok, continua
  │     └── 404 → stream encerrada por outro dispositivo
  │           → player.pause() + mostra modal
  └── Ao sair → DELETE /streams/:id + player.stop()
```

Quando Player C desconecta Player A:
1. Player C tenta iniciar → recebe 409 com lista [A, B]
2. Usuário escolhe encerrar Player A
3. Frontend chama `DELETE /streams/{streamId-A}`
4. Frontend chama `POST /streams/start` de novo → 201
5. Player A faz próximo ping (até 60s depois) → recebe 404
6. App do Player A pausa o vídeo e mostra: "Sessão encerrada por outro dispositivo"

**Trade-off**: Player A continua assistindo por até 60s antes de saber. Aceitável — Netflix e HBO Max têm delay similar. SSE/WebSocket para notificação instantânea pode ser adicionado no futuro sem mudar a API.

### Response 409 (novo contrato)

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

### Seguranca

| Regra (security-checklist.md) | Como fica | Impacto |
|-------------------------------|-----------|---------|
| **12.1 Race Condition** | Start mantém `$transaction` no PostgreSQL. Redis ZADD é atômico | Sem regressão |
| **12.2 Bypass de limites** | Count dentro da transaction do PostgreSQL | Sem regressão |
| **3.1 IDOR** | Ping valida ownership via Redis hash. Stop valida via PostgreSQL | Sem regressão |
| **12.3 Replay** | `@@unique([userId, profileId])` + upsert mantido | Sem regressão |
| **14.2 Excessive Exposure** | Response 409 expõe apenas: streamId, profileName, title, type, startedAt. Nunca expor userId, profileId raw, IP | Novo ponto de atenção |
| **13.6 Connection Pool** | Redis elimina ~100 queries/s do pool do Prisma | Melhoria |

## Consequences

### Positive

- Elimina ~100% das queries de ping no PostgreSQL
- Redis suporta 100k+ ops/s — escala para 50.000+ usuários sem mudança
- UX melhor: usuário vê quais dispositivos estão ativos e escolhe qual encerrar
- Intervalo de 60s ainda dá 2 chances de ping dentro do timeout de 2min
- Infraestrutura Redis já existe no projeto (cache TMDB, account lockout)

### Negative

- Redis é volátil — se reiniciar, perde estado de lastPing (recovery automático em 2min, streams expiram sozinhas)
- Dual-state: PostgreSQL tem o registro, Redis tem o lastPing — risco de dessincronização
- Complexidade adicional de manter dois storages em sync (start/stop escrevem nos dois)
- Response 409 com `activeStreams[]` é um novo ponto de atenção para Excessive Data Exposure (14.2)
