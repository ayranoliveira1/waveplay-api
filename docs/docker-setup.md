# WavePlay API — Docker Setup

---

## Visão Geral

| Serviço | Imagem | Porta |
|---------|--------|-------|
| db | PostgreSQL 17 Alpine | 5432 |
| redis | Redis 7 Alpine | 6379 |

---

## docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: waveplay-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: waveplay
      POSTGRES_PASSWORD: waveplay123
      POSTGRES_DB: waveplay
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U waveplay"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: waveplay-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

---

## .env (desenvolvimento local)

```env
# App
PORT=3333
NODE_ENV=development

# Database
DATABASE_URL=postgresql://waveplay:waveplay123@localhost:5432/waveplay

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=48h

# TMDB
TMDB_ACCESS_TOKEN=seu-token-aqui
TMDB_BASE_URL=https://api.themoviedb.org/3

# Redis
REDIS_URL=redis://localhost:6379
```

---

## Comandos

```bash
# Subir banco e cache
docker compose up -d

# Rodar migrations
pnpm prisma migrate dev

# Seed dos planos iniciais
pnpm prisma db seed

# Iniciar app local
pnpm start:dev

# Derrubar tudo
docker compose down

# Derrubar + limpar volumes (reset do banco)
docker compose down -v
```

---

## Fluxo recomendado

```
1. git clone → copiar .env.example para .env → preencher TMDB_ACCESS_TOKEN
2. docker compose up -d
3. pnpm install
4. pnpm prisma generate
5. pnpm prisma migrate dev
6. pnpm start:dev
```
