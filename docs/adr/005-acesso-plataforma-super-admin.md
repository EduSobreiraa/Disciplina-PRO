# ADR 005 — Acesso de plataforma e SUPER_ADMIN

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

`SUPER_ADMIN` administra a plataforma Spark, não uma empresa. Colocá-lo em `User` ou `TenantMembership` misturaria contextos, permitiria bypass do isolamento multi-tenant e dificultaria auditar ações administrativas.

## Decisão

Será criada a entidade `PlatformAccess`, vinculada a `User`, com role `SUPER_ADMIN` e status `ACTIVE` ou `SUSPENDED`. Ela é independente de qualquer `TenantMembership` e não concede participação implícita em tenant algum.

O acesso administrativo usará guard, contexto, rotas e casos de uso de plataforma próprios. Rotas normais de tenant continuam exigindo `TenantContextGuard`; `SUPER_ADMIN` não o ignora nem pode escolher arbitrariamente uma membership.

Capacidades do MVP:

- criar, suspender e encerrar tenants;
- criar o convite nominal do primeiro CEO e executar sua substituição segura;
- habilitar ou desabilitar programas globais por tenant;
- administrar catálogo e acessos da plataforma.

Não fazem parte do papel:

- visualizar conteúdo privado de participantes;
- impersonar usuários;
- obter acesso indiscriminado a relatórios internos de tenants;
- editar dados diretamente no banco.

### Bootstrap e continuidade

O primeiro acesso será criado por comando operacional único, sem endpoint público. O comando recebe identidade explicitamente pelo ambiente de execução, cria ou reutiliza o `User`, concede `PlatformAccess` em transação e falha se já existir um acesso ativo. Nenhum segredo ou senha de bootstrap será versionado.

Depois do bootstrap, somente um `SUPER_ADMIN` ativo pode conceder ou suspender outro acesso. O sistema pode possuir mais de um para continuidade operacional, mas nunca permite suspender o último ativo. Toda alteração é auditada.

O primeiro CEO entra por convite nominal. Um tenant só se torna operacional após existir seu CEO ativo. A substituição cria ou ativa o sucessor e encerra o acesso anterior na mesma transação, preservando exatamente um CEO ativo.

### Auditoria

`AuditEvent` passa a aceitar ações de plataforma:

- `tenantId` é opcional para eventos estritamente globais e preenchido quando a ação possui tenant alvo;
- `actorMembershipId` e `actorPlatformAccessId` são opcionais individualmente, mas exatamente um identifica o ator humano;
- o bootstrap inicial usa ator de sistema explicitamente tipado;
- constraints de banco e casos de uso garantem a exclusividade do ator;
- metadata nunca recebe credenciais ou conteúdo privado.

Eventos mínimos incluem `PLATFORM_ACCESS_GRANTED`, `PLATFORM_ACCESS_SUSPENDED`, `TENANT_CREATED`, `TENANT_SUSPENDED`, `TENANT_CLOSED`, `TENANT_CEO_ASSIGNED`, `PROGRAM_ENABLED` e `PROGRAM_DISABLED`.

## Consequências

- `SUPER_ADMIN` não integra `TenantRole` e não aparece em `TenantMembership`;
- haverá boundary explícito entre `identity-access`, administração de plataforma e contexto de tenant;
- ações globais e direcionadas a tenant permanecem rastreáveis no mesmo modelo de auditoria;
- o bootstrap exige comando operacional testável e documentação de execução antes do deploy;
- acesso administrativo segue privilégio mínimo e não enfraquece privacidade ou isolamento.

