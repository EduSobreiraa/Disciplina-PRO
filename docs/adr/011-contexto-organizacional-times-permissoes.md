# ADR 011 — Contexto organizacional, times e permissões

- Estado: aceita
- Data: 21/07/2026
- Fase: B2.0

## Contexto

A identidade autenticada da B1 informa somente `User` e `AuthSession`. A B2 precisa transformar a seleção não confiável de `X-Tenant-Id` em contexto empresarial atual, representar times sem permitir relações cruzadas entre tenants e combinar a capacidade geral da role com o escopo concreto do recurso.

Concentrar essas decisões em controllers, claims JWT ou filtros opcionais de Prisma permitiria divergências entre módulos e tornaria o isolamento dependente da disciplina de cada chamada.

## Decisão

### Lifecycle de tenant

`TenantStatus` permanece:

```text
PENDING
ACTIVE
SUSPENDED
CLOSED
```

Transições permitidas:

```text
PENDING → ACTIVE
PENDING → CLOSED
ACTIVE → SUSPENDED
SUSPENDED → ACTIVE
ACTIVE → CLOSED
SUSPENDED → CLOSED
```

- `PENDING` identifica tenant criado pela plataforma que ainda não possui primeiro CEO ativo;
- `ACTIVE` exige exatamente um CEO ativo e permite resolver contexto empresarial;
- `SUSPENDED` bloqueia todo contexto empresarial sem reescrever memberships ou times;
- `CLOSED` é terminal no MVP e preserva histórico sem permitir novos contextos;
- ativação inicial ocorre somente pela composição transacional da aceitação do convite do primeiro CEO na B3;
- suspensão, reativação e fechamento são casos de uso de plataforma, exigem motivo operacional e auditoria;
- reativação exige que o tenant ainda possua exatamente um CEO ativo;
- `suspendedAt` registra a suspensão corrente e volta a `null` na reativação; `closedAt` é preenchido somente no fechamento e nunca é limpo;
- fechar tenant revoga seu acesso efetivo, mas os efeitos persistentes sobre enrollments serão implementados quando esse agregado existir;
- `name`, `slug` e `timeZone` são validados no caso de uso; slug é globalmente único e timezone usa identificador IANA conforme ADR 002.

### Modelo de time

`Team` pertence a exatamente um tenant e possui:

```text
id, tenantId, name, normalizedName, createdAt, updatedAt, archivedAt
```

- time ativo possui `archivedAt = null`;
- arquivamento é o único encerramento do MVP e não apaga vínculos ou histórico;
- time arquivado não recebe membros, não concede escopo administrativo e não é retornado em listagens correntes;
- restauração é explícita, auditada e revalida conflito de nome;
- nomes ativos são únicos no tenant por forma normalizada;
- `normalizedName` usa trim, normalização Unicode NFC, espaços internos colapsados e lowercase, sem substituir o nome de exibição.

`TeamRole` possui somente:

```text
MEMBER
MANAGER
```

`TeamMembership` representa a associação atual única entre uma `TenantMembership` e um `Team`:

```text
id, tenantId, teamId, membershipId, role, assignedAt, endedAt
```

- vínculo ativo possui `endedAt = null`;
- encerramento preserva a linha e gera auditoria;
- uma nova atribuição do mesmo par reativa a linha existente, atualiza `assignedAt`, limpa `endedAt` e gera novo evento;
- o histórico de intervalos anteriores permanece em `AuditEvent`; não serão criadas linhas duplicadas para o mesmo par;
- arquivar um time ou inativar uma membership encerra seus vínculos ativos na mesma transação;
- suspender tenant ou membership bloqueia o escopo imediatamente, mas não reescreve os vínculos;
- reativar `TenantMembership` não reativa automaticamente vínculos encerrados.

### Isolamento estrutural

`TeamMembership.tenantId` é redundância intencional para permitir integridade referencial composta. O banco terá:

```text
UNIQUE (tenantId, normalizedName) WHERE archivedAt IS NULL
UNIQUE (teamId, membershipId)
UNIQUE (id, tenantId) em Team e TenantMembership para suportar as FKs compostas
FOREIGN KEY (teamId, tenantId) REFERENCES Team (id, tenantId)
FOREIGN KEY (membershipId, tenantId) REFERENCES TenantMembership (id, tenantId)
```

Assim, nem Prisma, SQL acidental ou um caso de uso defeituoso consegue ligar entidades de tenants diferentes. Índices de consulta empresarial começam por `tenantId` quando o acesso não parte de uma chave já composta.

### Contexto de tenant

Rotas empresariais seguem obrigatoriamente:

```text
AuthenticationGuard
  → TenantContextGuard
  → PermissionGuard, quando houver permission declarada
  → Controller
  → caso de uso com validação de escopo
```

`TenantContextGuard` recebe `CurrentPrincipal.userId` e `X-Tenant-Id`, consulta o estado atual e somente cria contexto quando todos estiverem habilitados:

```text
User.ACTIVE
Tenant.ACTIVE
TenantMembership.ACTIVE
```

O contexto confiável contém somente:

```text
tenantId, membershipId, userId, tenantRole
```

- o JWT continua sem tenant, role, times ou permissions;
- controllers consomem o contexto validado, nunca o header bruto para autorizar;
- contexto é resolvido novamente a cada requisição;
- `SUPER_ADMIN` não ignora o guard e só acessa rota empresarial se possuir membership ativa normal;
- rotas de plataforma usam `PlatformAccessGuard` e contexto próprios, sem `X-Tenant-Id` como fonte de privilégio.

### Erros HTTP do contexto

| Situação | HTTP | Código |
|---|---:|---|
| bearer ausente ou inválido | 401 | `AUTHENTICATION_REQUIRED` |
| `X-Tenant-Id` ausente em rota empresarial | 400 | `TENANT_CONTEXT_REQUIRED` |
| header malformado | 400 | `INVALID_TENANT_HEADER` |
| tenant inexistente, indisponível ou sem membership ativa | 403 | `TENANT_ACCESS_DENIED` |
| role sem capacidade geral | 403 | `PERMISSION_DENIED` |
| role possui capacidade, mas não o escopo do recurso | 403 | `RESOURCE_SCOPE_DENIED` |
| recurso não pertence ao tenant corrente | 404 | `RESOURCE_NOT_FOUND` |

A resposta não distingue tenant inexistente, suspenso, fechado ou membership ausente, evitando revelar estado empresarial a um usuário sem acesso.

## Permissions e escopo

Permissions são capacidades estáveis da aplicação, não strings fornecidas pelo cliente. A hierarquia empresarial é cumulativa, mas escopo nunca é inferido somente da role.

| Permission | USER | MANAGER | CEO | Escopo adicional obrigatório |
|---|:---:|:---:|:---:|---|
| `MEMBERSHIP_READ_SELF` | sim | sim | sim | membership atual |
| `MEMBERSHIP_READ_SCOPED` | não | sim | sim | Manager: time administrado; CEO: tenant |
| `MEMBERSHIP_INACTIVATE_SCOPED` | não | sim | sim | Manager: somente USER de time administrado; CEO: USER/MANAGER |
| `MEMBERSHIP_REACTIVATE_SCOPED` | não | sim | sim | mesmas regras e nova atribuição de time explícita |
| `MEMBERSHIP_SUSPEND` | não | não | sim | somente USER/MANAGER do tenant |
| `MEMBERSHIP_CHANGE_ROLE` | não | não | sim | somente USER ↔ MANAGER |
| `TEAM_READ_ASSIGNED` | sim | sim | sim | vínculo ativo; Manager também vê time administrado |
| `TEAM_READ_ALL` | não | não | sim | tenant atual |
| `TEAM_CREATE` | não | não | sim | tenant atual |
| `TEAM_UPDATE` | não | não | sim | tenant atual e time ativo |
| `TEAM_ARCHIVE` | não | não | sim | tenant atual |
| `TEAM_RESTORE` | não | não | sim | tenant atual e nome disponível |
| `TEAM_MEMBERS_READ_SCOPED` | não | sim | sim | Manager: time administrado; CEO: tenant |
| `TEAM_MEMBERS_ASSIGN` | não | não | sim | time e membership do tenant atual |
| `TEAM_MANAGERS_ASSIGN` | não | não | sim | alvo com `TenantRole.MANAGER` |

Regras complementares:

- `PermissionGuard` verifica somente se a role possui a capacidade declarada;
- o caso de uso carrega o recurso pelo `tenantId` confiável e valida ownership, alvo e escopo de time;
- `TenantRole.MANAGER` sem `TeamRole.MANAGER` ativo não recebe acesso a terceiros;
- para reativar um USER inativo, o Manager precisa administrar atualmente um time no qual o alvo possua `TeamMembership` encerrada; esse vínculo histórico comprova o escopo, mas não é reativado junto com a membership;
- Manager nunca administra CEO, Manager, cria time, promove role ou amplia o próprio escopo;
- CEO não altera outro CEO por rota empresarial;
- único CEO, substituição e ações sobre CEO pertencem a caso de uso de plataforma transacional;
- conteúdo privado nunca integra permissions gerenciais.

## Fronteira entre B2 e B3

A B2 implementa:

- criação de tenant `PENDING` pela plataforma;
- suspensão, reativação e fechamento de tenant;
- guards, contexts, permissions, times e lifecycle de memberships já existentes;
- substituição do CEO por caso de uso de plataforma quando o sucessor já possui identidade elegível;
- repositories e testes de isolamento usando fixtures internas.

A B3 implementa:

- entrada nominal por convite;
- criação ou reutilização de `User` na aceitação;
- criação da `TenantMembership` e atribuições iniciais de time;
- convite do primeiro CEO;
- ativação operacional do tenant após a aceitação válida do primeiro CEO.

Não haverá endpoint temporário na B2 para criar membros ou CEO sem convite. A B2 expõe boundaries transacionais que a B3 poderá compor sem acessar Prisma diretamente.

## Auditoria mínima

Alterações organizacionais são atômicas com seu `AuditEvent`. Eventos mínimos da B2:

```text
TENANT_CREATED
TENANT_SUSPENDED
TENANT_REACTIVATED
TENANT_CLOSED
TEAM_CREATED
TEAM_UPDATED
TEAM_ARCHIVED
TEAM_RESTORED
TEAM_MEMBERSHIP_ASSIGNED
TEAM_MEMBERSHIP_ENDED
MEMBERSHIP_SUSPENDED
MEMBERSHIP_REACTIVATED
MEMBERSHIP_INACTIVATED
MEMBERSHIP_ROLE_CHANGED
TENANT_CEO_REPLACED
```

Metadata contém apenas identificadores, roles, motivo operacional controlado e campos objetivos alterados; nunca recebe credenciais ou conteúdo privado.

## Consequências

- isolamento existe no guard, no caso de uso, no repository e em constraints do banco;
- permissions não substituem regras de ownership e escopo;
- o header seleciona contexto, mas nunca concede acesso por si só;
- o schema carrega `tenantId` redundante onde isso fortalece integridade;
- histórico detalhado de reatribuições de time depende da auditoria append-only;
- B2.1 pode modelar Prisma e migration sem reabrir decisões de lifecycle ou autorização.

## Não adotado

- tenant e role no JWT: congelariam autorização mutável;
- `SUPER_ADMIN` com bypass de tenant: misturaria plataforma e empresa;
- middleware Prisma que injeta tenant implicitamente: esconderia o escopo e não cobriria SQL raw;
- role de tenant suficiente para Manager: permitiria acesso global sem time administrado;
- vínculo de time sem `tenantId`: deixaria a integridade cruzada apenas na aplicação;
- soft delete genérico: contrariaria o lifecycle explícito do ADR 003.
