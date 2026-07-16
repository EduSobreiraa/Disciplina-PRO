# ADR 003 — Lifecycle, exclusão e retenção

- Estado: aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

Adicionar `deletedAt` a todas as entidades esconderia regras diferentes sob uma abstração única, complicaria unicidades e permitiria que queries esquecessem filtros. O produto também contém fatos imutáveis, estados reversíveis e conteúdo privado sujeito a exclusão real.

## Decisão

Não existe soft delete universal. Cada agregado expressa seu lifecycle no domínio, e repositories aplicam o escopo correspondente por padrão.

| Categoria | Estratégia no MVP |
|---|---|
| `Tenant` | status e `suspendedAt`/`closedAt`; fechamento não apaga histórico |
| `TenantMembership` | status e `deactivatedAt`; pode ser reativada conforme regras da B0.5 |
| `Team` | `archivedAt`; times arquivados não recebem novos membros |
| `Invitation` | estados `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED` e respectivos instantes |
| `Program`/`TenantProgram` | estados `ARCHIVED`/`DISABLED`; versões publicadas permanecem referenciáveis |
| `Enrollment` | lifecycle `AVAILABLE`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| fatos de execução | não são apagados silenciosamente; correção/revogação precisa ser explícita e auditável |
| `XpTransaction` | append-only; correções usam transação compensatória |
| `AuditEvent` | imutável e sem soft delete |
| conteúdo privado | exclusão pelo titular deve remover ou anonimizar o conteúdo conforme política específica anterior a `execution` |
| dados efêmeros de sessão | hard delete permitido após revogação e janela de retenção definida no ADR de refresh token |

## Regras de query

1. Controllers nunca escolhem se incluem registros inativos; o caso de uso determina e o repository materializa o escopo.
2. Listagens comuns excluem entidades arquivadas, fechadas ou inativas conforme seu lifecycle.
3. Consultas históricas e auditoria precisam solicitar inclusão explicitamente.
4. Toda query empresarial continua limitada por `tenantId`, inclusive para registros inativos.
5. Relações não usam cascade delete para remover fatos de negócio ou auditoria.

## Unicidade e restauração

- unicidades de identidade e membership permanecem estáveis durante inatividade para favorecer reativação da mesma entidade;
- nomes ou slugs reutilizáveis após arquivamento exigem índice único parcial com predicado explícito;
- índices parciais serão implementados em migration SQL revisada enquanto o suporte correspondente do Prisma permanecer preview;
- restaurar uma entidade revalida conflitos de unicidade, permissões e estado do tenant;
- reativação gera `AuditEvent` e não cria uma nova identidade quando a regra de negócio exige continuidade.

## Hard delete

Hard delete é permitido apenas para:

- rollback de transação antes de o fato se tornar observável;
- limpeza isolada de testes e desenvolvimento;
- dados efêmeros após a retenção aprovada;
- atendimento de exclusão/anonimização de conteúdo privado ou dados pessoais, por caso de uso autorizado.

Não será exposto um endpoint CRUD genérico de exclusão. Operações HTTP como `DELETE /teams/:id` representam casos de uso de encerramento/arquivamento e podem ser refinadas para ações explícitas.

## Retenção

Os períodos numéricos de retenção serão definidos antes de staging, pois dependem de requisitos legais e operacionais ainda não aprovados. Até lá:

- auditoria e fatos de negócio não são expurgados automaticamente;
- metadata nunca recebe conteúdo íntimo;
- conteúdo privado não é copiado para reporting, logs ou auditoria;
- qualquer job futuro de expurgo deve ser idempotente, observável e testado.

## Consequências

- lifecycle fica legível no domínio e nos casos de uso;
- evita-se um filtro global frágil de `deletedAt IS NULL`;
- repositories terão métodos explícitos para visão atual e histórica;
- algumas migrations precisarão de SQL deliberado para índices parciais;
- política legal de retenção continua como gate anterior a staging, sem bloquear o primeiro schema estrutural.

## Referências

- [Prisma — índices parciais](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [Prisma — recursos de banco sem representação direta](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features)
