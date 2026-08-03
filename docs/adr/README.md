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
| [008](008-access-token-jwt.md) | JWT curto identifica usuário e sessão, não autorização | Aceita |
| [009](009-refresh-token-rotativo.md) | Refresh token opaco, rotativo e com reuse detection | Aceita |
| [010](010-transporte-cors-csrf.md) | Sessão híbrida, CORS estrito e CSRF assinado | Aceita |
| [011](011-contexto-organizacional-times-permissoes.md) | Contexto de tenant, times e autorização por role mais escopo | Aceita |
| [012](012-convites-entrada-nominal.md) | Convites, entrada nominal, token de uso único e entrega por e-mail | Aceita |
| [013](013-catalogo-habilitacao-disponibilidade.md) | Catálogo global, habilitação por tenant e disponibilidade idempotente | Aceita |
| [014](014-execucao-ciclos-fatos-privacidade.md) | Execução, ciclos, fatos diários e privacidade | Aceita |
| [015](015-eventos-internos-gamificacao-auditoria.md) | Eventos internos duráveis, gamificação e auditoria | Aceita |
| [016](016-EscolhasDev.md) | Fornecedores e parâmetros operacionais do MVP | Aceita |
