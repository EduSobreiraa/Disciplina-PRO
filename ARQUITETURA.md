# Disciplina PRO — Arquitetura do Produto

> Spark Inteligência Corporativa · Documento vivo  
> Versão arquitetural: 2.0 · Atualizado em: 14/07/2026

## 1. Visão do produto

O **Disciplina PRO** é uma plataforma B2B SaaS multi-tenant da Spark Inteligência Corporativa para acompanhamento comportamental e execução de programas de desenvolvimento.

O **Projeto 66** é o primeiro programa disponibilizado dentro da plataforma. Ele não é o sistema completo e não deve ser acoplado ao núcleo do produto.

```text
Plataforma Spark
└── Empresas (tenants)
    ├── Times
    ├── Membros
    ├── Programas habilitados
    ├── Execuções individuais
    └── Relatórios de adesão
```

No MVP, os programas são padronizados e administrados pela Spark. Customização por empresa, billing, IA, notificações e relatórios avançados ficam fora do escopo.

Os protótipos `frontend/disciplina-pro.html` e `frontend/protocolo_66_ios (1).html` são referências funcionais e visuais. Ambos serão integralmente analisados e desmontados de forma incremental em componentes React, estilos modulares, hooks, regras de domínio e adapters de persistência. Eles não representam a arquitetura final e não devem ser copiados como componentes monolíticos.

O painel existente em `disciplina-pro.html` será incorporado à experiência da plataforma de acordo com seus limites de domínio. O conteúdo específico do Projeto 66 permanecerá isolado no módulo `projeto66`. Funcionalidades compartilháveis serão extraídas para `shared` somente quando houver reutilização real.

O tracker mensal de comportamentos do protótipo Disciplina PRO é uma capacidade transversal de acompanhamento pessoal da plataforma, acessível em **Minha evolução**. Ele não pertence ao Projeto 66 e não é cadastrado como `Program`. Programas podem futuramente gerar ou sugerir comportamentos, mas não possuem ownership do tracker geral.

## 2. Stack e estilo arquitetural

| Área | Decisão |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL |
| Arquitetura | Monolito modular em camadas |
| Multi-tenancy | Banco compartilhado, isolado por `tenantId` |
| Integração | API REST + eventos internos do monolito |

Microserviços, filas externas e acesso ao Prisma diretamente por controllers não serão utilizados no MVP.

## 3. Módulos do backend

```text
src/modules/
├── identity-access/
├── organizations/
├── invitations/
├── programs/
├── execution/
├── gamification/
├── audit/
└── reporting/
```

Cada módulo deve possuir responsabilidades e ownership de dados claros. Operações importantes devem ser implementadas como casos de uso separados; evitar classes genéricas, como um `UserService`, acumulando responsabilidades de diferentes domínios.

## 4. Fluxo em camadas

```text
Requisição HTTP
  ↓
AuthenticationGuard
  ↓
TenantContextGuard
  ↓
PermissionGuard
  ↓
Controller
  ↓
Caso de uso
  ↓
Domínio
  ↓
Repository
  ↓
Prisma
  ↓
PostgreSQL
```

- `AuthenticationGuard`: valida o token e identifica o usuário.
- `TenantContextGuard`: valida a membership e estabelece o tenant atual.
- `PermissionGuard`: verifica a capacidade geral da role.
- Controller: adapta HTTP, DTOs e respostas; não contém regra de negócio.
- Caso de uso: valida escopo do recurso e regras específicas.
- Repository: recebe dados de domínio, não DTOs HTTP, e não contém autorização.

Toda consulta a dados de empresa deve possuir escopo explícito de tenant. O isolamento não pode depender apenas de filtros fornecidos pelo cliente.

O access token JWT identifica somente usuário e sessão; não carrega tenant, role ou permissões. `X-Tenant-Id` seleciona explicitamente o contexto e seu estado atual é validado no banco. Claims, assinatura e rotação de chaves estão no [ADR 008](docs/adr/008-access-token-jwt.md).

Sessões usam refresh token opaco, rotativo e persistido apenas por hash. Reutilização revoga a família; access token permanece somente em memória e refresh permanece em cookie `HttpOnly`. A política está no [ADR 009](docs/adr/009-refresh-token-rotativo.md).

CORS aceita apenas origens exatas por ambiente. Refresh e logout exigem origem permitida e token CSRF assinado ligado à sessão. O transporte completo está no [ADR 010](docs/adr/010-transporte-cors-csrf.md).

## 5. Identidade, organização e permissões

### 5.1 Modelo organizacional

```text
User
└── TenantMembership
    └── TeamMembership
        └── Team
```

Entidades centrais:

- `User`
- `Tenant`
- `TenantMembership`
- `Team`
- `TeamMembership`

Regras:

- um usuário pode participar de vários tenants;
- uma membership representa o usuário dentro de uma empresa;
- a role pertence a `TenantMembership`, nunca diretamente a `User`;
- um time pertence a um único tenant;
- um usuário pode participar de vários times;
- um manager pode administrar vários times;
- o CEO não precisa pertencer a um time para acessar todo o tenant.

Restrições:

```text
UNIQUE (tenantId, userId)
UNIQUE (teamId, membershipId)
```

Roles do tenant: `USER`, `MANAGER`, `CEO`.  
Roles do time: `MEMBER`, `MANAGER`.

### 5.2 Role e escopo

A autorização depende de duas dimensões:

```text
Role + escopo do recurso
```

As permissões da empresa são cumulativas:

```text
USER → MANAGER → CEO
```

- `USER`: executa programas e consulta ou gerencia apenas os próprios registros.
- `MANAGER`: também gerencia usuários comuns e consulta adesão, logs e métricas dos times administrados. Não cria times, promove managers ou acessa outros times.
- `CEO`: também administra times, managers, todos os membros, relatórios e auditoria do tenant.
- `SUPER_ADMIN`: papel de plataforma, fora da hierarquia do tenant; administra tenants, primeiro CEO e programas habilitados.

### 5.3 Estados de membership

`TenantMembership` possui os estados `ACTIVE`, `SUSPENDED` e `INACTIVE`. Convite pendente não cria membership: a aceitação cria uma membership ativa. Suspensão é temporária; inativação representa desligamento; reativação é explícita, auditada e não recupera automaticamente times ou escopos administrativos.

O acesso efetivo exige usuário, tenant e membership habilitados. Suspensão ou desligamento bloqueia operações imediatamente e provoca pausa administrativa dos enrollments ativos, sem retomada automática. O MVP mantém exatamente um CEO ativo por tenant operacional e sua substituição ocorre atomicamente por caso de uso de plataforma. As transições completas estão no [ADR 004](docs/adr/004-lifecycle-tenant-membership.md).

### 5.4 Super-admin

`SUPER_ADMIN` não é `TenantRole` nem atributo de `User`. Ele é representado por `PlatformAccess`, vinculado a `User` e independente de memberships. Usa contexto, guards, rotas e casos de uso de plataforma próprios; não ignora o isolamento das rotas de tenant, não permite impersonação e não concede acesso a conteúdo privado.

O primeiro acesso é criado por comando operacional único, sem endpoint público ou segredo versionado. A plataforma admite múltiplos administradores ativos, mas protege o último contra suspensão. A decisão e o modelo de auditoria estão no [ADR 005](docs/adr/005-acesso-plataforma-super-admin.md).

## 6. Convites e criação de contas

```text
CEO ou Manager cria convite
  ↓
Sistema gera token
  ↓
Funcionário informa token e credenciais
  ↓
Sistema valida o convite
  ↓
Cria ou reutiliza User
  ↓
Cria TenantMembership
  ↓
Cria TeamMemberships
  ↓
Invalida o convite
  ↓
Registra auditoria
```

Entidades: `Invitation` e `InvitationTeam`.

O convite contém `tenantId`, `email`, `role`, times e papéis, `expiresAt`, `createdByMembershipId` e `status`.

Status: `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`.

Regras:

- convite nominal e vinculado a um e-mail;
- token opaco, aleatório, de uso único e com expiração;
- somente `tokenHash` é persistido;
- convite pode ser revogado;
- manager convida somente `USER` para times que administra;
- CEO convida `USER` e `MANAGER`.

## 7. Catálogo e habilitação de programas

Entidades:

- `Program`
- `ProgramVersion`
- `ProgramPhase`
- `ProgramActivity`
- `TenantProgram`

```text
Program
└── ProgramVersion
    └── ProgramPhase
        └── ProgramActivity

Tenant
└── TenantProgram
    └── Program
```

`Program` é global e não possui `tenantId` no MVP. `TenantProgram` representa a habilitação da identidade do programa para uma empresa, não de uma versão específica.

Status de `Program`: `ACTIVE`, `ARCHIVED`.
Status de `ProgramVersion`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
Status de `TenantProgram`: `ENABLED`, `DISABLED`.

Tipos iniciais de atividade: `CHECKLIST`, `TASK`, `MISSION`, `DAILY_SCORE`, `MEDITATION`, `REFLECTION`.

Frequências iniciais: `ONCE`, `DAILY`, `WEEKLY`.

### 7.1 Versionamento

`ProgramVersion` usa número crescente por programa e estados `DRAFT`, `PUBLISHED` e `ARCHIVED`. Rascunhos são editáveis; publicação torna toda a árvore imutável; arquivamento impede novos inícios sem afetar execuções existentes. Existe no máximo uma versão rascunho e uma publicada por programa.

O enrollment `AVAILABLE` ainda não fixa uma versão. Ao iniciar, captura atomicamente a versão publicada corrente; esse vínculo nunca muda. Desabilitar o programa no tenant bloqueia novas ofertas e inícios, mas não interrompe ciclos em andamento. O contrato completo está no [ADR 006](docs/adr/006-versionamento-de-programas.md).

## 8. Disponibilização, adesão e ciclos

Quando um programa é habilitado para uma empresa:

- todos os membros ativos recebem uma inscrição disponível;
- novos membros recebem os programas habilitados ao aceitar o convite;
- `USER`, `MANAGER` e `CEO` recebem o programa;
- cada pessoa escolhe quando iniciar.

Entidade central:

```text
Enrollment
├── tenantProgramId
├── membershipId
├── programVersionId
├── cycleNumber
├── status
├── startedAt
├── completedAt
└── abandonedAt
```

Status: `AVAILABLE`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ABANDONED`.

```text
UNIQUE (tenantProgramId, membershipId, cycleNumber)
```

Deve existir no máximo um ciclo `ACTIVE` ou `PAUSED` por membro e programa.

Um usuário pode executar o mesmo programa várias vezes. No Projeto 66, o ciclo avança por dias corridos desde `startedAt`:

```text
currentDay = diferença entre hoje e startedAt + 1 - dias formalmente pausados
```

Consequências:

- dias sem registro continuam consumindo o ciclo;
- ausência conta negativamente na adesão;
- pausa formal congela a contagem;
- o ciclo alcança o dia 66 mesmo com registros incompletos;
- fim do período e conclusão de todas as atividades são conceitos diferentes.

### 8.1 Histórico de pausas

`EnrollmentPause` persiste instante da solicitação, primeira data civil congelada, instante e data civil da retomada, origem, motivo e ator. O bloqueio de operações é imediato, mas somente dias civis completos são descontados: a pausa começa a congelar em D + 1 e a data de retomada volta a ser ativa.

Existe no máximo uma pausa aberta por enrollment e intervalos nunca se sobrepõem. Pausas administrativas não retomam automaticamente e bloqueios simultâneos precisam estar todos resolvidos. O cálculo e os casos de borda estão no [ADR 007](docs/adr/007-intervalos-de-pausa-do-enrollment.md).

## 9. Execução de programas

Entidades:

- `Enrollment`
- `EnrollmentPause`
- `ActivityCompletion`
- `DailyRecord`
- `PillarScore`

```text
Enrollment
├── EnrollmentPause
├── ActivityCompletion
└── DailyRecord
    └── PillarScore
```

Restrições:

```text
UNIQUE (enrollmentId, programDay)
UNIQUE (dailyRecordId, pillarKey)
UNIQUE (enrollmentId, activityId, programDay)
```

O sistema persiste fatos, não apenas percentuais agregados.

## 10. Privacidade

Manager e CEO podem visualizar dados objetivos de adesão:

- programa iniciado e dia atual;
- dias registrados;
- atividades, missões e checklists concluídos;
- conquistas, XP e streak;
- percentual de progresso, inatividade e último registro.

Permanecem privados:

- notas pessoais;
- frases motivacionais;
- relatos emocionais e gratidão;
- reflexões abertas;
- conteúdo de meditação;
- outras respostas pessoais.

A gestão acompanha adesão, não conteúdo íntimo. Dados objetivos e conteúdo privado devem ser separados nos modelos, DTOs de resposta e caminhos de consulta. Conteúdo privado nunca será copiado para auditoria, relatórios ou metadata de eventos.

## 11. Auditoria, logging e reporting

`AuditEvent` é imutável. Eventos de tenant possuem `tenantId`; eventos estritamente globais podem omiti-lo. O ator humano é identificado exclusivamente por `actorMembershipId` ou `actorPlatformAccessId`, enquanto o bootstrap usa ator de sistema tipado. Seu contrato contém:

```text
tenantId
actorMembershipId
actorPlatformAccessId
targetMembershipId
entityType
entityId
action
metadata
occurredAt
```

Eventos iniciais incluem convites, mudanças de membership e time, habilitação de programa e ações de execução.

Os conceitos permanecem separados:

- Audit: histórico factual de negócio.
- Technical logging: diagnóstico da aplicação.
- Reporting: métricas e agregações.

## 12. Gamificação

Entidades: `XpTransaction` e `UserAchievement`.

O saldo não será a única fonte de verdade. Cada alteração de XP gera uma transação imutável e idempotente.

Regras iniciais:

| Ação | XP |
|---|---:|
| Atividade obrigatória concluída | 10 |
| Dia completo | 50 |
| Programa concluído | 500 |

Conquistas iniciais: primeira atividade, primeiro dia completo, sequências de 7 e 30 dias e programa concluído.

As regras ficam em código no MVP. Streak é derivado de `DailyRecord` e poderá futuramente ser mantido como projeção.

Na fundação frontend, `gamification` implementa o mesmo princípio por meio de um ledger local temporário: componentes publicam uma ação com chave de origem, o domínio registra a concessão uma única vez e ações desfeitas geram transações compensatórias. Saldo, nível e progresso nunca são persistidos como fonte primária. O adapter local será substituído pela API sem mover regras para os componentes.

## 13. Eventos internos

A operação principal é separada de suas consequências:

```text
CompleteActivityUseCase
  ↓
salva ActivityCompletion
  ↓
publica ActivityCompleted
  ├── GamificationModule: concede XP e conquistas
  ├── AuditModule: registra o evento
  └── ReportingModule: atualiza ou invalida métricas
```

Serão usados eventos internos do monolito. Não haverá broker, fila externa ou microserviço no MVP. Consumidores devem ser idempotentes.

## 14. Entidades consolidadas

```text
User
Tenant
TenantMembership
PlatformAccess
AuthSession
RefreshToken
Team
TeamMembership

Invitation
InvitationTeam

Program
ProgramVersion
ProgramPhase
ProgramActivity
TenantProgram

Enrollment
EnrollmentPause
ActivityCompletion
DailyRecord
PillarScore

AuditEvent
XpTransaction
UserAchievement
```

## 15. Dados persistidos e derivados

Persistidos: memberships, times, convites, programas e versões, enrollments, pausas, conclusões, registros diários, pontuações, transações de XP, conquistas e auditoria.

Calculados: dia atual, percentual de progresso, adesão, streak atual e máximo, média de pontuação, usuários inativos, ranking e métricas por time.

Indicadores não devem criar uma segunda fonte de verdade. Projeções futuras precisam poder ser reconstruídas a partir dos fatos.

### 15.1 Convenções estruturais da B0.5

A B0.5 foi integralmente fechada pelos ADRs em [`docs/adr/`](docs/adr/README.md):

- IDs canônicos são UUIDv7 gerados pelo PostgreSQL 18 e mapeados como `@db.Uuid`; continuam opacos e não substituem `createdAt` nem autorização;
- instantes usam `timestamptz(3)` em UTC; `Tenant.timeZone` usa IANA e cada enrollment captura um snapshot imutável do timezone e sua data civil inicial;
- `programDay` usa diferença entre datas civis no timezone capturado, nunca divisão de milissegundos por 24 horas;
- não existe soft delete universal: tenant, membership, time, convite, programa e enrollment expressam lifecycle próprio;
- auditoria e transações de XP são imutáveis; conteúdo privado possui fluxo específico de exclusão/anonimização;
- índices únicos parciais necessários serão migrations SQL revisadas enquanto o recurso equivalente do Prisma permanecer preview.
- memberships possuem lifecycle explícito e `SUPER_ADMIN` usa acesso de plataforma isolado;
- versões publicadas são imutáveis e enrollments registram pausas por dias civis completos;
- JWT identifica usuário e sessão, enquanto autorização permanece atual no banco;
- refresh token é opaco, rotativo e protegido por cookie, CORS estrito e CSRF assinado.

Essas convenções são obrigatórias para o primeiro schema e só podem ser substituídas por um novo ADR.

### 15.2 Baseline Prisma da B1

A migration `20260716030447_identity_baseline` materializa o primeiro recorte persistente: `User`, `Tenant`, `TenantMembership`, `PlatformAccess`, `AuthSession`, `RefreshToken` e `AuditEvent`. IDs usam `uuidv7()` do PostgreSQL 18 e instantes usam `timestamptz(3)`.

Constraints SQL complementam o Prisma com lifecycle coerente, CEO ativo único por tenant, expirações válidas, ator exclusivo de auditoria e eventos de auditoria protegidos contra update/delete. `PrismaModule` possui um único client com adapter `pg` e lifecycle controlado pelo NestJS.

O módulo `identity-access` separa casos de uso, portas e infraestrutura. E-mails possuem forma normalizada única; senhas usam Argon2id com 19 MiB, duas iterações e paralelismo 1. O primeiro `PlatformAccess` é criado por comando operacional único, sob lock transacional e com auditoria de sistema, nunca por endpoint público.

## 16. Rotas essenciais planejadas

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout

POST   /invitations
GET    /invitations
GET    /invitations/validate
POST   /invitations/accept
DELETE /invitations/:id

GET   /members
GET   /members/:membershipId
PATCH /members/:membershipId/role
PATCH /members/:membershipId/status

POST   /teams
GET    /teams
GET    /teams/:teamId
PATCH  /teams/:teamId
DELETE /teams/:teamId
POST   /teams/:teamId/members
DELETE /teams/:teamId/members/:membershipId

GET /programs
GET /programs/:programId

GET  /enrollments
GET  /enrollments/:enrollmentId
POST /enrollments/:enrollmentId/start
POST /enrollments/:enrollmentId/pause
POST /enrollments/:enrollmentId/resume
POST /enrollments/:enrollmentId/abandon
GET  /enrollments/:enrollmentId/today
POST /enrollments/:enrollmentId/activities/:activityId/complete
POST /enrollments/:enrollmentId/daily-records

GET /reports/me
GET /reports/teams/:teamId
GET /reports/tenant
GET /reports/inactive-members

GET /audit/me
GET /audit/teams/:teamId
GET /audit/tenant
```

As rotas poderão ser refinadas, preservando casos de uso, privacidade e limites dos módulos.

## 17. Estrutura planejada do frontend

O inventário detalhado dos protótipos, o mapa de componentes e a ordem operacional da migração estão em [`docs/MIGRACAO_FRONTEND.md`](docs/MIGRACAO_FRONTEND.md).

```text
frontend/src/
├── app/
│   ├── layouts/
│   ├── providers/
│   └── router/
├── modules/
│   ├── auth/
│   ├── daily-ritual/
│   ├── discipline-content/
│   ├── dashboard/
│   ├── gamification/
│   ├── profile/
│   ├── programs/
│   └── projeto66/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   └── utils/
├── App.jsx
└── main.jsx
```

Rotas atuais da plataforma: `/login`, `/app`, `/app/ritual`, `/app/missoes`, `/app/conquistas`, `/app/protocolo`, `/app/programas`, `/app/programas/projeto66`, `/app/minha-evolucao` e `/app/perfil`.

O Projeto 66 possui módulo próprio. O frontend poderá usar repositórios simulados ou `localStorage` durante a fundação, desde que componentes não dependam diretamente do mecanismo de persistência.

### 17.1 Identidade visual

A migração deve preservar as identidades existentes, sem substituí-las por um design genérico:

- a plataforma Disciplina PRO utiliza a estética escura, vermelha e orientada a performance do protótipo `disciplina-pro.html`;
- o módulo Projeto 66 utiliza a estética mobile/iOS, laranja, fogo e dourado do protótipo `protocolo_66_ios (1).html`.

O compartilhamento de componentes não obriga compartilhamento de tema. Tokens globais cobrem apenas fundamentos comuns; tokens de domínio preservam paletas, tipografias, densidade, animações e estados próprios. Mudanças visuais intencionais exigem decisão registrada.

### 17.2 Estratégia mobile-first

Todo frontend será projetado e validado primeiro para telas pequenas e interação por toque. Desktop é uma expansão progressiva do mesmo fluxo, não a referência primária reduzida posteriormente.

Requisitos mínimos:

- áreas interativas confortáveis para toque;
- navegação acessível com uma mão nos fluxos individuais;
- conteúdo essencial sem depender de hover;
- uso correto de safe areas em dispositivos móveis;
- formulários compatíveis com teclado virtual;
- layouts fluidos sem largura fixa obrigatória;
- movimento reduzido quando solicitado pelo sistema;
- validação nas larguras móveis antes do aceite desktop.

## 18. Restrições de implementação

- Não transformar o sistema em microserviços.
- Não acoplar o Projeto 66 ao núcleo da plataforma.
- Não colocar role em `User`.
- Não acessar Prisma em controllers.
- Não criar services genéricos com muitas responsabilidades.
- Não expor conteúdo privado em relatórios ou auditoria.
- Não permitir queries sem escopo de tenant.
- Não iniciar customização de programas, billing, IA ou notificações no MVP.
- Não converter cegamente os protótipos HTML.
- Manter este documento atualizado junto de mudanças arquiteturais relevantes.

## 19. Roadmap

### Fase 1 — Arquitetura mínima

Concluída. As decisões que governam o schema foram promovidas para a fase formal B0.5.

### Fase 2 — Fundação frontend

- [x] shell inicial do Disciplina PRO;
- [x] navegação e roteamento;
- [x] catálogo de programas;
- [x] área simulada do usuário;
- [x] rota e página inicial do Projeto 66;
- [x] contexto e dados simulados centralizados;
- [x] layout e rotas internas iniciais do Projeto 66;
- [x] realinhamento visual inicial do shell ao protótipo Disciplina PRO.

### Fase 3 — Projeto 66

Migração incremental do protótipo, separando interface, regras, estado e persistência.

Estado atual:

- [x] layout, rotas internas, conteúdo e repository local;
- [x] visão geral, tracker, progresso, fases, streak, heatmap e gráfico;
- [x] registro diário, missões e pontuação dos pilares;
- [x] separação local entre registro objetivo e conteúdo privado;
- [x] checklist persistido por dia e regra de Dia de Comando;
- [x] meditação, Novo Eu, crise e dia difícil em repository privado.

### Estratégia de migração dos protótipos

- inventariar telas, estados, regras e persistência antes de extrair componentes;
- migrar fatias funcionais completas, uma por vez;
- separar componentes visuais de regras e acesso a dados;
- converter CSS global em estilos organizados por módulo e tokens compartilhados;
- preservar os HTMLs originais como referência até a validação funcional da migração;
- comparar cada fatia React com o comportamento do protótipo antes de considerá-la concluída;
- não manter manipulação direta do DOM como mecanismo de estado no React.

### Fase 4 — Backend core

O backend seguirá gates dependentes, detalhados em `docs/ROADMAP.md`:

1. **B0 — Fundação técnica:** ambiente, configuração, erros, segurança HTTP, banco de desenvolvimento, testes e CI;
2. **B0.5 — Decisões arquiteturais:** `ProgramVersion`, `EnrollmentPause`, `TenantMembership`, `SUPER_ADMIN`, IDs, timezone, soft delete, JWT, refresh token e CORS/CSRF;
3. **B1 — Persistência e Identity Access:** dividida em contrato do schema (B1.1), baseline e Prisma (B1.2), credenciais (B1.3), núcleo de sessões (B1.4), HTTP/CORS/CSRF (B1.5), autenticação (B1.6) e hardening (B1.7);
4. **B2–B3 — Organizações e convites:** isolamento multi-tenant, roles, escopo e entrada de membros;
5. **B4–B5 — Programas e execução:** catálogo global, habilitação, enrollments e Projeto 66;
6. **B6–B7 — Consequências e leitura:** eventos, gamificação, auditoria, reporting e privacidade;
7. **B8–B9 — Produto integrado:** adapters HTTP e áreas administrativas;
8. **B10 — Operação:** staging, hardening e release do MVP.

A B0.5 está aprovada. Seu primeiro schema e migration são as próximas entregas da B1, que inicia `identity-access`.

## 20. Histórico de decisões

| Data | Decisão |
|---|---|
| 06/07/2026 | Protótipo inicial do Disciplina PRO documentado como produto individual. |
| 12/07/2026 | Disciplina PRO redefinido como plataforma B2B SaaS multi-tenant. |
| 12/07/2026 | Projeto 66 definido como primeiro programa, desacoplado do núcleo. |
| 12/07/2026 | Backend definido como monolito modular NestJS + TypeScript + Prisma + PostgreSQL. |
| 12/07/2026 | Multi-tenancy definido por banco compartilhado e isolamento por `tenantId`. |
| 12/07/2026 | Role movida para `TenantMembership`; autorização combina role e escopo. |
| 12/07/2026 | Eventos internos adotados para gamificação, auditoria e reporting. |
| 12/07/2026 | Versionamento de programas, histórico de pausas, estados de membership e super-admin registrados como decisões pendentes. |
| 12/07/2026 | Os dois protótipos HTML serão migrados integral e incrementalmente para componentes React e CSS modular, preservando-os como referência durante a validação. |
| 12/07/2026 | Inventário inicial dos dois protótipos e plano de migração por fatias registrados em `docs/MIGRACAO_FRONTEND.md`. |
| 12/07/2026 | Fidelidade às identidades visuais dos dois protótipos definida como requisito obrigatório da migração. |
| 12/07/2026 | F1 do Projeto 66 concluída com layout imersivo, rotas internas, conteúdo das fases, repository local e tema iOS/fogo. |
| 12/07/2026 | Disciplina PRO consolidado como interface inicial; shell, dashboard e catálogo realinhados à estética “sala de guerra”, com transição explícita para o Projeto 66. |
| 12/07/2026 | F2 do Projeto 66 concluída: indicadores derivados, progresso por fase, streak, heatmap e gráfico conectados ao ciclo persistido, com testes automatizados. |
| 12/07/2026 | F3 do Projeto 66 concluída: registro diário idempotente, seis pilares, missões, placar e persistência fisicamente separada de emoção e gratidão. |
| 12/07/2026 | Mobile-first definido como requisito obrigatório para toda implementação frontend. |
| 12/07/2026 | F4 do Projeto 66 concluída: checklist mobile-first persistido por dia, progresso por período, Dia de Comando e reset controlado. |
| 12/07/2026 | F5 do Projeto 66 concluída: meditação, respiração, Novo Eu, crise e dia difícil isolados no domínio privado e desenhados mobile-first. |
| 12/07/2026 | Tracker comportamental definido como capacidade transversal do Disciplina PRO em “Minha evolução”, separado do catálogo de programas. |
| 12/07/2026 | Primeira fatia do tracker migrada: grade mensal, ciclo de marcas, justificativas, comportamentos e métricas com repository local. |
| 14/07/2026 | README raiz criado e fluxo de versionamento definido: documentação, validações, revisão de diff, commit descritivo e push de mudanças aprovadas. |
| 14/07/2026 | F6 concluída: tracker comportamental com central de justificativas, rankings, dias perfeitos, backup validado e teste Playwright mobile-first. |
| 14/07/2026 | Auditoria completa do frontend aprovada em 12 rotas e quatro viewports (320, 375, 768 e 1440 px), com correções de overflow e alvos de toque; evidências registradas em `docs/AUDITORIA_FRONTEND.md`. |
| 14/07/2026 | F7 concluída: ritual diário separado em módulo próprio, com fatos por data, quatro etapas, timer 30/30 persistente e conclusão idempotente preparada para gamificação futura. |
| 14/07/2026 | F8 concluída: gamificação frontend centralizada em ledger append-only; saldo, nível e progresso são derivados, ações desfeitas geram compensações e conquistas são fatos persistidos. |
| 14/07/2026 | F9 concluída: missões derivadas de tracker, ritual e ledger, recompensas idempotentes e protocolo informativo migrado; migração funcional dos protótipos encerrada. |
| 14/07/2026 | Relatório consolidado de progresso, práticas, testes, tecnologias e preparação do backend registrado em `docs/RELATORIO_PROGRESSO.md`. |
| 14/07/2026 | Checklist operacional pré-backend criado em `docs/PRE_BACKEND_CHECKLIST.md`, incluindo runtime, PostgreSQL, GitHub, MCPs, segurança e decisões pendentes. |
| 14/07/2026 | B0 iniciada com workspace npm, scaffold NestJS/TypeScript, health check, validação global, Swagger, Helmet, throttling, logging estruturado e lockfile único; scaffold Express acidental removido. |
| 14/07/2026 | B0.5 criada como gate obrigatório anterior ao schema Prisma; decisões de domínio, identidade e segurança passam a preceder a primeira migration e o início de `identity-access`. |
| 15/07/2026 | B0 concluída com configuração validada, contrato de erros, request ID, limite de payload, PostgreSQL em Compose, readiness, integração real e CI; `PrismaModule` permanece na B1 para respeitar o gate B0.5. |
| 15/07/2026 | SonarQube Cloud integrado ao CI com análise baseada no GitHub Actions e cobertura LCOV de frontend/backend; análise automática deve permanecer desativada e o gate inicial observa código novo. |
| 15/07/2026 | Primeiro bloco da B0.5 aprovado: UUIDv7 gerado pelo PostgreSQL, tempo UTC com calendário IANA por enrollment e lifecycle explícito sem soft delete universal. |
| 15/07/2026 | Segundo bloco da B0.5 aprovado: lifecycle de TenantMembership, proteção do CEO e acesso SUPER_ADMIN isolado do contexto de tenant. |
| 15/07/2026 | Terceiro bloco da B0.5 aprovado: versões publicadas imutáveis, vínculo no início do enrollment e pausas por dias civis completos. |
| 15/07/2026 | B0.5 concluída: JWT curto, refresh rotativo com reuse detection e sessão por cookie protegida por CORS estrito e CSRF assinado. |
| 15/07/2026 | B1 decomposta em sete gates menores, separando schema, migration, credenciais, sessão, transporte, autenticação e hardening. |
| 16/07/2026 | B1.1–B1.3 concluídas: schema Prisma inicial, baseline SQL, PrismaModule, identidade Argon2id e bootstrap transacional do primeiro SUPER_ADMIN. |

## 21. Versionamento e documentação

O repositório remoto oficial é `EduSobreiraa/Disciplina-PRO`, com desenvolvimento principal na branch `main` enquanto o projeto estiver em fase inicial individual.

Cada conjunto coerente de mudanças deve:

1. atualizar `ARQUITETURA.md` quando afetar módulos, entidades, ownership, segurança, privacidade, contratos ou decisões estruturais;
2. atualizar `docs/MIGRACAO_FRONTEND.md` quando alterar o progresso ou a estratégia da migração;
3. manter o `README.md` alinhado aos comandos, estrutura e estado público do projeto;
4. executar lint, testes e build proporcionais à mudança;
5. realizar validação mobile-first no navegador para mudanças visuais, quando o ambiente permitir;
6. revisar o diff e excluir credenciais, configurações locais e artefatos gerados;
7. criar commit descritivo e enviar ao remoto somente após as validações.

Commits devem representar unidades compreensíveis de trabalho. Não incluir `.env`, relatórios de teste, builds, caches, perfis de navegador ou outros dados locais.

Mudanças exclusivamente em arquivos Markdown exigem revisão documental e de links, mas não acionam lint, testes, build, cobertura ou SonarQube. O workflow de CI ignora commits cujo conjunto de arquivos seja integralmente Markdown.

---

Este é um documento vivo. Toda alteração relevante de módulos, ownership, entidades, permissões, privacidade, eventos ou contratos deve atualizá-lo no mesmo conjunto de mudanças.
