# ADR 013 — Catálogo global, habilitação por tenant e disponibilidade

- Estado: aceita
- Data: 25/07/2026
- Fase: B4.0

## Contexto

O Disciplina PRO precisa oferecer programas globais da Spark a empresas diferentes sem copiar conteúdo, permitir customização por tenant ou acoplar o núcleo ao Projeto 66. O ADR 006 já definiu versões publicadas imutáveis e fixação da versão somente no início do ciclo. Falta fechar o contrato operacional para autoria, publicação, habilitação, leitura e criação idempotente de inscrições `AVAILABLE`.

Habilitar um programa afeta todas as memberships ativas do tenant e a aceitação posterior de novos membros. Essa operação precisa suportar concorrência e reexecução sem duplicar disponibilidade. Ao mesmo tempo, desabilitar ou arquivar não pode apagar histórico nem interromper ciclos já iniciados.

## Decisão

### Ownership e fronteiras

O módulo `programs` possui:

- `Program`, `ProgramVersion`, `ProgramPhase` e `ProgramActivity`, todos globais;
- `TenantProgram`, que habilita um `Program` para um tenant;
- a criação da disponibilidade inicial em `Enrollment`.

Este ADR detalha o ADR 006 e substitui apenas sua menção a um “ponteiro corrente”: a unicidade parcial de `PUBLISHED` é a fonte de verdade da versão corrente, evitando estado duplicado.

Somente `PlatformAccess` ativo administra catálogo, publicação e habilitação. Nenhuma role empresarial cria ou edita programas. `CEO`, `MANAGER` e `USER` ativos podem ler o catálogo efetivamente disponível no próprio tenant; a role não muda o conteúdo oferecido.

O Projeto 66 é dados de uma árvore publicada. O núcleo conhece tipos e frequências genéricos, nunca rotas, componentes, nomes de pilares ou regras exclusivas do Projeto 66.

### Modelo global

`Program` representa a identidade estável:

```text
id
slug
name
summary
status                 ACTIVE | ARCHIVED
createdAt
updatedAt
archivedAt?
```

- `slug` é global, canônico e único;
- somente `ACTIVE` aceita rascunho, publicação, nova habilitação ou início;
- `ARCHIVED` é terminal no MVP;
- a versão corrente é a única versão `PUBLISHED` do programa, derivada do índice parcial; não existe um segundo ponteiro mutável em `Program`.

`ProgramVersion` representa uma definição executável:

```text
id
programId
versionNumber
status                 DRAFT | PUBLISHED | ARCHIVED
title
description
durationDays
createdAt
updatedAt
publishedAt?
archivedAt?
```

O banco impõe:

- `UNIQUE (programId, versionNumber)`;
- no máximo um `DRAFT` por programa por índice parcial;
- no máximo um `PUBLISHED` por programa por índice parcial;
- coerência entre status e timestamps;
- duração estritamente positiva.

`ProgramPhase` pertence a uma versão:

```text
id
programVersionId
key
title
description
position
```

`ProgramActivity` pertence a uma fase e à mesma versão:

```text
id
programVersionId
programPhaseId
key
title
description
position
type
frequency
configuration
```

As chaves são funcionais e estáveis entre versões quando representam o mesmo conceito. IDs sempre mudam ao copiar uma versão. O banco reforça:

- `UNIQUE (programVersionId, key)` para fases e atividades;
- `UNIQUE (programVersionId, position)` para fases;
- `UNIQUE (programPhaseId, position)` para atividades;
- FK composta que impede associar atividade a fase de outra versão.

Tipos iniciais:

```text
CHECKLIST
TASK
MISSION
DAILY_SCORE
MEDITATION
REFLECTION
```

Frequências iniciais:

```text
ONCE
DAILY
WEEKLY
```

`configuration` é JSON validado por allowlist conforme o tipo. Ele contém apenas definição global de execução; nunca recebe progresso, resposta pessoal, conteúdo íntimo, HTML executável ou configuração específica de tenant.

### Lifecycle editorial

```text
ProgramVersion: DRAFT → PUBLISHED → ARCHIVED
Program:        ACTIVE → ARCHIVED
```

- criar um programa cria sua primeira versão `DRAFT` número 1;
- editar programa altera somente seus dados estáveis enquanto `ACTIVE`;
- editar árvore altera somente a versão `DRAFT`;
- criar nova versão copia explicitamente a última definição publicada para um novo `DRAFT`, com novos IDs e próximo número;
- publicação valida a árvore completa, bloqueia programa e versões concorrentes, arquiva a publicada anterior e publica o rascunho na mesma transação;
- nenhuma rota atualiza ou remove uma árvore publicada/arquivada;
- correção posterior sempre cria outra versão;
- arquivar programa não apaga nem reescreve `TenantProgram`, `Enrollment` ou fatos históricos.

A definição publicável exige ao menos uma fase e uma atividade, posições contíguas iniciadas em 1, chaves não vazias, tipo/frequência compatíveis e configuração válida. A publicação registra apenas IDs, versão e contagens na auditoria; não duplica a árvore em metadata.

### Habilitação por tenant

`TenantProgram` representa a relação estável entre tenant e programa:

```text
id
tenantId
programId
status                 ENABLED | DISABLED
enabledAt
disabledAt?
createdAt
updatedAt
```

O banco impõe `UNIQUE (tenantId, programId)`. A habilitação exige:

- `PlatformAccess` atual ativo;
- tenant `ACTIVE`;
- programa `ACTIVE`;
- uma versão corrente `PUBLISHED`.

Transições:

```text
ausente  → ENABLED
ENABLED  → DISABLED
DISABLED → ENABLED
```

Repetir habilitação de `ENABLED` ou desabilitação de `DISABLED` é sucesso idempotente e não duplica auditoria de transição. Reabilitar reutiliza a mesma linha. A operação bloqueia tenant, programa e relação quando existente para serializar requisições concorrentes.

Desabilitar:

- bloqueia novas disponibilidades e novos inícios;
- não remove enrollment `AVAILABLE`;
- não pausa nem altera enrollment `ACTIVE` ou `PAUSED`;
- retira o programa do catálogo efetivamente disponível até eventual reabilitação.

O acesso efetivo para oferta ou início exige simultaneamente tenant `ACTIVE`, programa `ACTIVE`, `TenantProgram ENABLED` e versão publicada corrente. O estado persistido isolado não concede disponibilidade.

### Enrollment mínimo da B4

A B4 materializa somente o contrato necessário para disponibilidade:

```text
Enrollment
├── id
├── tenantId
├── tenantProgramId
├── programId          redundante para FKs compostas
├── membershipId
├── programVersionId?   null enquanto AVAILABLE
├── cycleNumber         1 na oferta automática inicial
├── status              AVAILABLE
├── timeZone?           capturado somente no início
├── startedAt?
├── startedOn?
├── createdAt
└── updatedAt
```

O lifecycle após `AVAILABLE`, novos ciclos, pausas e execução pertencem à B5. A B4 impõe desde já:

- `UNIQUE (tenantProgramId, membershipId, cycleNumber)`;
- FKs compostas que mantêm enrollment, membership e `TenantProgram` no mesmo tenant e a versão no mesmo programa;
- `programVersionId`, timezone e datas de início nulos em `AVAILABLE`;
- exatamente uma oferta automática de ciclo 1 por membership/programa.

Ao habilitar um programa, a mesma transação cria com semântica `insert on conflict do nothing` um enrollment `AVAILABLE` para cada membership `ACTIVE`, incluindo `CEO`, `MANAGER` e `USER`.

Ao aceitar um convite, a transação de aceitação cria a membership e solicita ao serviço de disponibilidade do módulo `programs` as ofertas de todos os `TenantProgram ENABLED` efetivos. O serviço recebe a transação atual; não abre uma segunda transação e não depende de evento assíncrono. Assim, a membership nunca fica parcialmente aceita sem suas ofertas, e reexecução continua idempotente.

Reativar uma membership provisiona ofertas que estiverem ausentes. Suspender ou inativar membership não exclui enrollments; os efeitos sobre ciclos iniciados seguem os ADRs 004 e 007 e serão implementados na B5.

### Contratos HTTP

Fronteira de plataforma:

```text
POST  /api/platform/programs
PATCH /api/platform/programs/:programId
POST  /api/platform/programs/:programId/versions
PUT   /api/platform/program-versions/:versionId
POST  /api/platform/program-versions/:versionId/publish
POST  /api/platform/programs/:programId/archive
PUT   /api/platform/tenants/:tenantId/programs/:programId/enable
PUT   /api/platform/tenants/:tenantId/programs/:programId/disable
```

Fronteira de tenant:

```text
GET /api/programs
GET /api/programs/:programId
```

As leituras de tenant exigem bearer e `X-Tenant-Id`, consultam apenas catálogo efetivamente disponível e não aceitam `tenantId` por query/body. A resposta de detalhe expõe somente a versão publicada corrente; versões históricas serão resolvidas exclusivamente por enrollments já iniciados.

### Concorrência e erros estáveis

Casos críticos:

- duas habilitações concorrentes criam uma relação e um enrollment por membership;
- habilitação concorrente com aceitação de convite produz a oferta exatamente uma vez;
- duas publicações do mesmo programa não deixam mais de uma versão `PUBLISHED`;
- publicação concorrente com início futuro resolve a versão sob lock na transação de início da B5.

Erros públicos:

| Situação | HTTP | Código |
|---|---:|---|
| payload, chave, ordem ou configuração inválida | 400 | `INVALID_PROGRAM_DATA` |
| programa/versão/relação não encontrado na fronteira atual | 404 | `RESOURCE_NOT_FOUND` |
| slug já utilizado | 409 | `PROGRAM_SLUG_ALREADY_EXISTS` |
| já existe rascunho | 409 | `PROGRAM_DRAFT_ALREADY_EXISTS` |
| definição não pode ser publicada | 409 | `PROGRAM_VERSION_NOT_PUBLISHABLE` |
| transição editorial inválida | 409 | `INVALID_PROGRAM_TRANSITION` |
| tenant/programa sem condição para habilitação | 409 | `PROGRAM_ENABLEMENT_NOT_ALLOWED` |
| usuário autenticado sem acesso de plataforma ativo | 403 | `PLATFORM_ACCESS_DENIED` |
| contexto empresarial inválido | 403 | códigos existentes de tenant |

### Auditoria

Eventos mínimos:

```text
PROGRAM_CREATED
PROGRAM_UPDATED
PROGRAM_VERSION_CREATED
PROGRAM_VERSION_UPDATED
PROGRAM_VERSION_PUBLISHED
PROGRAM_ARCHIVED
TENANT_PROGRAM_ENABLED
TENANT_PROGRAM_DISABLED
```

Eventos globais usam `actorPlatformAccessId` e não possuem `tenantId`. Habilitação/desabilitação registra o tenant afetado e o ator de plataforma. Metadata contém somente IDs, número da versão, status anterior/novo e contagens; não inclui a definição completa.

## Consequências

- o schema de `Enrollment` começa na B4, mas seu lifecycle executável permanece na B5;
- habilitação e entrada nominal compartilham um serviço transacional e idempotente de provisionamento;
- não há cópia ou customização de conteúdo por tenant;
- desabilitar ou arquivar preserva história e ciclos iniciados;
- o Projeto 66 pode ser semeado como catálogo, sem introduzir tipos específicos no domínio;
- publicação, habilitação e concorrência terão provas diretas em PostgreSQL antes dos controllers.
