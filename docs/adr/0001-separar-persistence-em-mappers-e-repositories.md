# ADR-0001: Separar persistence/ em mappers/ e repositories/

## Status

Accepted

## Context

A pasta `persistence/` dentro de cada módulo (BC) mistura dois conceitos distintos:
- **Mappers**: conversão entre objetos de domínio e formato Prisma (toDomain/toPrisma)
- **Repositories**: implementações concretas dos ports abstratos de persistência

Em módulos com múltiplas entidades (identity tem user, refresh-token, password-reset-token), a pasta `persistence/` acumula muitos arquivos sem distinção clara de responsabilidade.

## Decision

Separar `persistence/` em duas subpastas dentro de `infra/`:

```
infra/
├── mappers/
│   ├── prisma-user-mapper.ts
│   └── prisma-refresh-token-mapper.ts
└── repositories/
    ├── prisma-users-repository.ts
    └── prisma-refresh-tokens-repository.ts
```

## Consequences

### Positive

- Estrutura mais clara — cada pasta tem uma responsabilidade única
- Mais fácil navegar e encontrar arquivos em módulos com muitas entidades
- Padrão consistente em todos os BCs

### Negative

- Imports ficam levemente mais longos (um nível a mais de diretório)
- Repositories importam mappers de pasta irmã (`../mappers/`)
