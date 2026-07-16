# Registros de decisões arquiteturais

Os ADRs registram decisões que alteram contratos, schema, segurança ou operação. Uma decisão aceita só deve ser modificada por um novo ADR que a substitua explicitamente; o histórico não é reescrito.

| ADR | Decisão | Estado |
|---|---|---|
| [001](001-identificadores-uuidv7.md) | Identificadores UUIDv7 gerados pelo PostgreSQL | Aceita |
| [002](002-tempo-timezone-calendario.md) | Instantes UTC e calendário por timezone IANA | Aceita |
| [003](003-lifecycle-exclusao-retencao.md) | Lifecycle explícito e exclusão seletiva | Aceita |
| [004](004-lifecycle-tenant-membership.md) | Estados, transições e efeitos de TenantMembership | Aceita |
| [005](005-acesso-plataforma-super-admin.md) | Acesso SUPER_ADMIN separado do contexto de tenant | Aceita |
| [006](006-versionamento-de-programas.md) | Versões publicadas imutáveis e enrollment fixado no início | Aceita |
| [007](007-intervalos-de-pausa-do-enrollment.md) | Intervalos civis reproduzíveis de pausa do enrollment | Aceita |
