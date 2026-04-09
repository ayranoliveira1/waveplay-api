# ADR 0003 — RBAC simples via campo `role` no User

## Status

Accepted

## Context

O Admin BC (Tasks 17-20) precisa distinguir usuários comuns de administradores
para proteger 8 endpoints sob `/admin/*`. As duas abordagens consideradas
foram:

1. **Campo `role` no próprio `User`** — enum string (`"user" | "admin"`),
   guardado direto na tabela `users`, checado por um `AdminGuard` que lê
   `req.user.role` do JWT payload.
2. **Tabela de roles/permissions separada** — schema tipo `roles`,
   `permissions`, `role_permissions`, `user_roles`, com checagem fine-grained
   por ação (`plans:create`, `users:delete`, etc).

## Decision

Adotamos a opção **1 (campo `role` simples)**.

- `User.role` é um campo `string` com default `'user'`, populado no register
  e imutável via API (só muda via seed/DB direto).
- O JWT payload inclui `role` junto com `sub` e `family`, permitindo que o
  `AdminGuard` cheque sem round-trip ao banco.
- Um decorator `@Admin()` marca as rotas protegidas; o `AdminGuard` retorna
  403 para qualquer token de role diferente de `'admin'`.
- O campo `role` não é exposto no `UserPresenter` público — apenas no
  `AdminUserPresenter` usado pelas rotas de listagem admin.

## Consequences

### Positivas

- **Simplicidade:** 1 campo no banco + 1 guard + 1 decorator, sem tabelas
  extras, sem joins, sem cache de permissions.
- **Performance:** role vem no JWT — zero queries adicionais para verificar
  autorização.
- **Menor superfície de bugs:** sem sync entre tabela de roles e código, sem
  risco de permission drift.
- **Suficiente para o escopo atual:** o produto tem 2 roles e nenhum plano
  de mid-level (ex: "moderator", "support"). RBAC completo seria engenharia
  especulativa.

### Negativas

- **Não escala para granularidade fina.** Se algum dia precisarmos de roles
  como "support" (pode ver usuários mas não alterar) ou "billing_admin" (só
  gestão de planos), teremos que refatorar para um schema de permissions.
- **Promoção manual.** Não existe endpoint `PATCH /admin/users/:id/role` — um
  novo admin precisa ser promovido via `UPDATE users SET role = 'admin'` no
  DB. Aceitamos isso como trade-off de segurança (proteger contra escalação
  via API).
- **JWT carrega dado que pode ficar stale.** Se um admin for rebaixado, ele
  continua admin até o access token expirar (15min) — o refresh já vai pegar
  o novo role. Para force-logout imediato, revogar a family de refresh token.

## Alternativas consideradas

- **Tabela de roles/permissions (rejeitada):** overkill para 2 roles. Adiciona
  3 tabelas, queries extras no AuthGuard, e complexidade de cache/invalidation.
  Reavaliar se/quando surgir uma 3ª role.
- **Feature flags por usuário:** não resolve autorização de rotas,
  complementa.

## Referências

- [docs/architecture.md](../architecture.md) — estrutura do Admin BC
- [docs/business-rules.md](../business-rules.md) — seção 12 (Administração)
- [docs/security-checklist.md](../security-checklist.md) — seção 19 (Admin BC — RBAC & Authorization)
- [src/modules/admin/infra/guards/admin.guard.ts](../../src/modules/admin/infra/guards/admin.guard.ts) — implementação do guard
- [src/modules/admin/infra/decorators/admin.decorator.ts](../../src/modules/admin/infra/decorators/admin.decorator.ts) — decorator `@Admin()`
