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
| `AuditEvent` | imutável e sem soft delete durante sua vigência; retenção de 1 ano, salvo obrigação legal ou contratual diferente |
| conteúdo privado e dados pessoais de participante | quando juridicamente permitido, anonimizar e preservar apenas o necessário para auditoria, obrigações legais, estatísticas e integridade histórica |
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

Em 26/07/2026, a Spark aprovou para o PP-004:

- retenção operacional do tenant por até 60 dias após o encerramento da conta;
- após esse período, exclusão, anonimização ou retenção legal conforme a política aprovada;
- retenção de `AuditEvent` por 1 ano, salvo obrigação legal ou contratual diferente;
- execução da retenção de tenant por job automatizado;
- anonimização dos dados pessoais do participante, quando juridicamente permitida, preservando somente o necessário para auditoria, obrigações legais, estatísticas e integridade histórica.

A política pertence à Spark; jobs e mecanismos pertencem ao desenvolvimento. Hipóteses legais, bases, exceções e reflexos contratuais permanecem sujeitos à validação jurídica indicada em [`../../GOVERNANCA.md`](../../GOVERNANCA.md). Até a implementação e validação:

- auditoria e fatos de negócio não são expurgados automaticamente;
- metadata nunca recebe conteúdo íntimo;
- conteúdo privado não é copiado para reporting, logs ou auditoria;
- qualquer job futuro de expurgo deve ser idempotente, observável, auditado e testado.

## Consequências

- lifecycle fica legível no domínio e nos casos de uso;
- evita-se um filtro global frágil de `deletedAt IS NULL`;
- repositories terão métodos explícitos para visão atual e histórica;
- algumas migrations precisarão de SQL deliberado para índices parciais;
- implementação das políticas aprovadas e validação jurídica final continuam como gate anterior a staging, sem bloquear o primeiro schema estrutural.

## Histórico da decisão

- **15/07/2026:** estratégia de lifecycle aceita; prazos numéricos permaneceram postergados.
- **26/07/2026:** a decisão de governança do PP-004 aprovou os prazos e destinos acima; não alterou a arquitetura de lifecycle nem concluiu os mecanismos ou artefatos jurídicos pendentes.

## Referências

- [Prisma — índices parciais](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [Prisma — recursos de banco sem representação direta](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features)
