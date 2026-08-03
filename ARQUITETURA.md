# Disciplina PRO — Arquitetura do Produto

> Spark Inteligência Corporativa · Documento vivo  
> Versão arquitetural: 2.0 · Atualizado em: 26/07/2026

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

Os protótipos `frontend/disciplina-pro.html` e `frontend/protocolo_66_ios (1).html` são referências históricas funcionais e visuais. A migração funcional F0–F9 para componentes React, estilos modulares, hooks, regras e adapters foi concluída; os HTMLs não representam a arquitetura ativa.

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

`TeamMembership` carrega `tenantId` intencionalmente. Chaves estrangeiras compostas garantem no PostgreSQL que time e membership pertencem ao mesmo tenant; o contrato completo de contexto, lifecycle de time e permissions está no [ADR 011](docs/adr/011-contexto-organizacional-times-permissoes.md).

Os modelos, o índice único parcial de nome ativo e as constraints compostas foram materializados na migration organizacional da B2.1. Guards e casos de uso não podem substituir nem enfraquecer essas garantias estruturais.

Na B2.3.2, as operações empresariais de time foram expostas em `/api/teams` somente para CEO no tenant atual. O repository repete o filtro por `tenantId` e revalida o ator dentro da transação; criação, renomeação e restauração serializam por tenant antes de disputar o índice de nome. Arquivamento encerra e audita os `TeamMembership` ativos na mesma transação, e restauração nunca reativa esses vínculos implicitamente.

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

Na B2.3.3, o repository de memberships passou a revalidar ator e recurso dentro da transação. Manager opera somente USER ligado ao time que administra; o vínculo histórico encerrado comprova escopo apenas para reativação e nunca é restaurado automaticamente. Rebaixar Manager converte seus vínculos administrativos ativos em vínculos de membro, removendo privilégio imediatamente. A substituição de CEO exige o identificador do CEO atual esperado, serializa por tenant, inativa o predecessor, encerra seus vínculos e promove o sucessor elegível atomicamente.

A B2.4 encerrou a prova multi-tenant com uma matriz E2E sobre dois tenants e três times. A API rejeita bearer ausente ou revogado, seleção malformada, usuário sem membership, recurso de outro tenant, Manager fora do time administrado e tentativa de bypass por `SUPER_ADMIN`. Suspensão de membership/tenant e alteração de role são observadas por tokens já emitidos na requisição seguinte. O OpenAPI também é testado para bearer e `X-Tenant-Id` nas fronteiras corretas.

### 5.4 Super-admin

`SUPER_ADMIN` não é `TenantRole` nem atributo de `User`. Ele é representado por `PlatformAccess`, vinculado a `User` e independente de memberships. Usa contexto, guards, rotas e casos de uso de plataforma próprios; não ignora o isolamento das rotas de tenant, não permite impersonação e não concede acesso a conteúdo privado.

Na B2.3.1, `POST /api/platform/tenants` e as transições `suspend`, `reactivate` e `close` foram implementadas nesse boundary. Cada alteração valida novamente o acesso da plataforma, serializa transições concorrentes, grava o evento de auditoria na mesma transação e nunca cria contexto empresarial implícito para o `SUPER_ADMIN`.

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

O contrato completo foi fechado no [ADR 012](docs/adr/012-convites-entrada-nominal.md). Convites usam token aleatório de 32 bytes persistido somente por HMAC, TTL de 72 horas e unicidade pendente por tenant/e-mail. Conta nova aceita com senha; conta existente precisa aceitar autenticada e nunca tem sua senha substituída pelo token. Reenvio gira o segredo, o primeiro CEO ativa o tenant na mesma transação e o envio SMTP ocorre somente após o commit por um port próprio.

Na B3.1, `Invitation` e `InvitationTeam` foram materializados com criador membership preso ao mesmo tenant, criador de plataforma para CEO, índice único parcial de convite pendente, hash único, lifecycle temporal e FKs compostas que impedem times cruzados. Essas invariantes são testadas diretamente no PostgreSQL.

Na B3.2, o módulo `invitations` passou a administrar criação, listagem, reenvio e revogação. O segredo nasce de 32 bytes de CSPRNG e somente seu HMAC-SHA-256, protegido por `INVITATION_TOKEN_PEPPER` próprio, alcança o Prisma. CEO enxerga o tenant; Manager enxerga somente convites próprios e só atribui `MEMBER` em times ativos que administra. O primeiro CEO continua sendo uma operação exclusiva da plataforma sobre tenant `PENDING`.

Na B3.3, a aceitação passou a ter endpoints separados. O caminho público cria uma identidade somente quando o e-mail nominal ainda não existe e aplica a política de senha; o caminho autenticado não recebe senha e exige que o `userId` da sessão possua exatamente o e-mail normalizado do convite. O repository bloqueia o convite por hash com `FOR UPDATE` e, na mesma transação, valida tenant e times ativos, cria `TenantMembership`/`TeamMembership`, consome o convite e audita. Para CEO, também muda o tenant de `PENDING` para `ACTIVE`. Estados terminais, expiração, token desconhecido e identidade divergente compartilham `INVITATION_INVALID`.

Na B3.4, `InvitationDelivery` passou a usar `SmtpClient`, implementado com Nodemailer, após o commit. Desenvolvimento usa Mailpit `v1.30.5`, SMTP `1025` e UI `8025`. O endereço de aceitação é configurável e recebe o segredo apenas no fragmento; logs de falha registram somente o ID do convite. `test:mailpit` atravessa o SMTP real e consulta a API do Mailpit sem acoplar as regras de domínio ao serviço.

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

O enrollment `AVAILABLE` ainda não fixa uma versão. Ao iniciar, captura atomicamente a versão publicada corrente; esse vínculo nunca muda. Desabilitar o programa no tenant bloqueia novas ofertas e inícios, mas não interrompe ciclos em andamento. A versão corrente é derivada da única linha `PUBLISHED`, sem ponteiro duplicado em `Program`. O versionamento está no [ADR 006](docs/adr/006-versionamento-de-programas.md) e o contrato operacional de catálogo, habilitação e disponibilidade está no [ADR 013](docs/adr/013-catalogo-habilitacao-disponibilidade.md).

## 8. Disponibilização, adesão e ciclos

Quando um programa é habilitado para uma empresa:

- todos os membros ativos recebem uma inscrição disponível;
- novos membros recebem os programas habilitados ao aceitar o convite;
- `USER`, `MANAGER` e `CEO` recebem o programa;
- cada pessoa escolhe quando iniciar.

A B4 cria o `Enrollment AVAILABLE` mínimo e suas unicidades; início, ciclos adicionais, pausas e fatos de execução pertencem à B5. Habilitação e aceitação de convite usam o mesmo provisionador transacional e idempotente, evitando memberships aceitas sem suas ofertas.

Na B4.1, a árvore global, `TenantProgram` e o enrollment mínimo foram materializados. Índices parciais limitam cada programa a um draft e uma publicação; triggers impedem mutação de versões e árvores publicadas; `Enrollment.programId` redundante sustenta FKs compostas que provam simultaneamente tenant, programa habilitado, membership e versão.

Na B4.2, `programs` passou a administrar identidade e drafts pela fronteira exclusiva de plataforma. Publicação e criação de sucessor usam lock consultivo por programa e releitura após o lock; o sucessor copia chaves e conteúdo com novos IDs, a publicação anterior é arquivada atomicamente e metadata de auditoria contém apenas IDs, versão e contagens.

Na B4.3, habilitação e desabilitação são serializadas pela combinação tenant/programa. O provisionamento usa uma única instrução `INSERT ... SELECT ... ON CONFLICT DO NOTHING`, inclui apenas memberships e usuários ativos, preserva enrollments ao desabilitar e completa ofertas ausentes ao reabilitar.

Na B4.4, habilitação, aceitação de convite e reativação convergem no mesmo provisionador transacional. Um lock consultivo por tenant fecha a janela entre a criação de membership e a habilitação concorrente; a unicidade do enrollment mantém a reexecução segura. A leitura empresarial deriva o catálogo efetivo de tenant, membership, programa, `TenantProgram` e publicação correntes e retorna somente a árvore publicada.

A B4.5 encerrou a fase com uma matriz E2E sobre duas empresas e as roles `CEO`, `MANAGER`, `USER` e `SUPER_ADMIN`. A prova percorre autoria e publicação pela API, tentativa de mutação da árvore publicada no PostgreSQL, habilitação e desabilitação concorrentes, entrada posterior, auditoria, leitura efetiva e isolamento. O conteúdo usa somente tipos e configurações genéricos; regras de execução do Projeto 66 permanecem fora do núcleo de catálogo.

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

Na B5.0, o [ADR 014](docs/adr/014-execucao-ciclos-fatos-privacidade.md) fechou o contrato executável. `EnrollmentPause` representa o intervalo e `EnrollmentPauseCause` preserva bloqueios simultâneos de usuário, membership, tenant ou plataforma. Conclusões usam occurrence keys derivadas da frequência, calendário é calculado no timezone fixado e respostas privadas seguem tabela, repository, DTOs e rotas separados dos fatos objetivos.

Na B5.1, a quinta migration materializou essa fundação. Índices parciais limitam ciclo corrente e pausa aberta; causas simultâneas possuem unicidade própria; FKs compostas impedem fatos de outra versão ou tenant; conclusões, registros e scores são append-only, enquanto respostas privadas permanecem substituíveis somente por sua fronteira dedicada.

Na B5.2, o módulo `execution` passou a separar consultas de comandos de lifecycle por portas próprias. O início bloqueia o enrollment, usa o mesmo advisory lock da publicação e revalida ator, tenant, membership, habilitação e publicação na transação antes de congelar versão, timezone e data civil. `ExecutionCalendar` deriva datas IANA e desconta intervalos `[pauseStartsOn, resumedOn)` sem assumir dias de 24 horas. Conclusão é temporal e idempotente; abandono persiste seu motivo no ciclo sem incluí-lo na auditoria.

Na B5.3, `ExecutionAdministrativeBlocker` tornou explícita a integração síncrona entre `organizations` e `execution`. Pausas pessoais e administrativas reutilizam um único intervalo aberto e mantêm causas independentes. Suspensão ou inativação organizacional grava o bloqueio antes de efetivar a transição na mesma transação; reativação restaura acesso, mas não resolve causas nem retoma ciclos silenciosamente.

Na B5.4.0, capacidades de execução deixaram de depender de JSON semanticamente aberto. `ProgramVersion.executionConfiguration` define pilares e limites do registro diário, enquanto a configuração da atividade admite somente propriedades conhecidas e uma política limitada de resposta privada. Versões sem capacidades permanecem válidas com `{}`.

Na conclusão da B5.4, `ObjectiveExecutionFactsRepository` passou a controlar conclusões e registros append-only, idempotentes e datados pelo servidor contra a versão congelada no ciclo. `PrivateExecutionResponseRepository` e seu controller formam uma fronteira exclusiva para conteúdo substituível; auditoria registra apenas identificadores, dia e natureza da operação, nunca o payload. Pausas e estados terminais bloqueiam novas escritas, e locks por enrollment serializam reexecuções concorrentes.

Na B5.5.0, a consulta detalhada do enrollment ganhou uma projeção objetiva composta por definição das atividades, conclusões e registros diários com scores. Ela é deliberadamente incapaz de carregar `PrivateActivityResponse`. O adapter HTTP do Projeto 66 concentra autenticação, contexto de tenant, tratamento de erros e tradução da resposta; componentes não acessam `fetch` diretamente.

Na B5.5.1, o checklist do Projeto 66 foi reconciliado com a persistência append-only: chaves são compatíveis com a política editorial, conclusões ficam permanentemente marcadas e ações de desfazer/reiniciar foram removidas. A matriz E2E atravessa o boundary HTTP autenticado até a conclusão temporal do dia 66 e comprova que o payload privado não aparece na projeção nem na auditoria.

Na B5.5.2, `GET /session` passou a fornecer identidade e organizações ativas sem exigir um tenant previamente conhecido. O frontend mantém access token apenas em memória, restaura/rotaciona o refresh em single-flight e injeta o tenant selecionado no adapter. O ciclo objetivo deixou de usar `localStorage`. Chamadas usam `/api` na mesma origem por proxy, requisito para o cookie CSRF legível e os cookies `__Host-` restritos ao host.

Na B5.5.3, as ferramentas privadas do Projeto 66 também passaram à fronteira HTTP. Cada formulário resolve uma atividade editorial própria, evitando colisão de payloads. Respostas de atividades `ONCE`, como a definição de identidade, usam a ocorrência canônica do primeiro dia e permanecem acessíveis durante todo o ciclo; respostas `DAILY` continuam ligadas ao dia calculado. Nenhum repository local permanece no módulo `projeto66`.

Na B5.5.4, `PROJETO66_CATALOG` materializa o conteúdo específico como definição editorial do módulo `programs`, sem introduzir regras do produto no núcleo de `execution`. A CLI exige ator de plataforma ativo, cria e publica quando ausente, conclui um draft idêntico e recusa qualquer divergência existente. O frontend exporta seu contrato real de chaves, importado pelo teste do catálogo para impedir drift entre publicação e telas.

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

Desde a B6.5, `gamification` consome a projeção individual da API. O ledger, as regras de concessão e as conquistas são mantidos exclusivamente no servidor; o browser não concede nem reverte XP. Saldo, nível e progresso são derivados das transações persistidas.

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

São usados eventos internos duráveis no PostgreSQL, sem broker, fila externa ou microserviço no MVP. O contrato detalhado está no [ADR 015](docs/adr/015-eventos-internos-gamificacao-auditoria.md).

A B6.1 materializou `InternalEvent` como envelope append-only e `InternalEventDelivery` como estado independente por consumidor. Na B6.2, `execution` passou a publicar os três fatos objetivos do ADR 015 dentro da transação de origem. O módulo `events` provisiona entregas por contrato versionado, reivindica lotes com `SKIP LOCKED`, usa lease recuperável e confirma consequência e `PROCESSED` na mesma transação. Falhas guardam somente código controlado, usam retry limitado e podem ser reagendadas por comando auditado. Na B6.3, o consumidor `gamification` passou a validar o fato de origem e registrar `XpTransaction` e `UserAchievement` imutáveis, com projeção individual derivada e isolada por tenant.

Na B6.4, o módulo `audit` passou a possuir o contrato de auditorias derivadas e as consultas autorizadas. A referência opcional e única a `InternalEvent` torna a escrita derivada idempotente. As rotas pessoal, time e tenant aplicam permissões no boundary e repetem a validação de ator e escopo no repository; a projeção pública omite `metadata` para impedir exposição de campos livres ou conteúdo privado histórico.

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
InternalEvent
InternalEventDelivery
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

### 15.3 Núcleo de sessões da B1.4

`identity-access` emite access tokens `RS256` de 10 minutos com tipo `at+jwt`, `kid` allowlistado e claims mínimas `iss`, `aud`, `sub`, `sid`, `jti`, `iat` e `exp`. Tenant, role e permissões não entram no token. Chaves anteriores permanecem somente na coleção pública durante a janela de rotação.

Refresh tokens possuem 256 bits aleatórios, são persistidos apenas por HMAC-SHA-256 com pepper externo e rotacionados uma única vez. A rotação trava token e sessão no PostgreSQL; reutilização ou concorrência duplicada revoga toda a família e registra `REFRESH_TOKEN_REUSE_DETECTED`. Sessões duram no máximo 30 dias e cada refresh no máximo 7 dias ou até o limite absoluto.

Logout por sessão e revogação global são idempotentes. Falha de assinatura depois de persistir ou rotacionar revoga a sessão para não deixar credenciais ativas sem resposta válida. O transporte HTTP e a consulta de sessão pelo guard permanecem em B1.5 e B1.6.

### 15.4 Transporte HTTP da B1.5

`POST /api/auth/login`, `/refresh` e `/logout` validam `Origin` contra `FRONTEND_URL`; CORS declara origens, métodos e headers exatos. Login possui throttling mais restritivo e devolve o mesmo erro para usuário inexistente, desabilitado ou senha incorreta.

O access token é devolvido somente no corpo. Em produção, refresh e CSRF usam cookies `__Host-`, `Secure`, `SameSite=Lax`, `Path=/` e nenhum `Domain`; no HTTP de desenvolvimento, os nomes perdem o prefixo porque `__Host-` exige `Secure`. O refresh é `HttpOnly`; o CSRF é legível e deve ser repetido em `X-CSRF-Token`.

O token CSRF usa HMAC com uma chave derivada do pepper por separação de contexto, contém nonce aleatório e fica ligado ao `AuthSession.id`. Cookie e header são comparados antes da rotação/revogação, e o logger redige ambos. O frontend deve aplicar refresh single-flight: uma única rotação em andamento é compartilhada por todas as requisições que aguardam novo access token.

### 15.5 Principal autenticado da B1.6

Rotas HTTP são privadas por padrão; `@Public()` é uma exceção explícita usada somente em health e autenticação. `AuthenticationGuard` exige bearer estrito, valida assinatura e claims e consulta PostgreSQL para confirmar a associação usuário–sessão, usuário ativo, sessão não revogada e limite absoluto vigente.

`CurrentPrincipal` contém apenas `userId`, `sessionId` e `tokenId`. Não contém tenant, role, permissões ou `PlatformAccess`. `X-Tenant-Id` permanece entrada não confiável até o `TenantContextGuard`, que resolve `CurrentTenantContext` no banco a cada requisição. Rotas de plataforma usam `PlatformAccessGuard` e `CurrentPlatformContext` separados; nenhum dos dois altera o significado do principal autenticado.

### 15.6 Hardening e retenção da B1.7

O comando operacional `sessions:cleanup` revoga sessões que ultrapassaram o limite absoluto e marca seus refresh tokens como revogados. Famílias previamente revogadas só são eliminadas após 90 dias; os vínculos de rotação são removidos dentro da mesma transação e o comando não remove `AuditEvent`. A retenção de `AuditEvent` segue a política da Spark de 1 ano, salvo obrigação legal ou contratual diferente, por mecanismo próprio ainda pendente no PP-004. Execuções repetidas não alteram o resultado.

O CI impõe pisos iniciais de cobertura. No backend: 30% statements, 20% branches, 25% functions e 30% lines. No frontend: 19%, 60%, 40% e 19%, respectivamente. Esses valores são baselines de não regressão, não metas finais. A action do SonarQube Cloud é fixada por SHA revisado. O runbook `docs/OPERACAO_IDENTITY_ACCESS.md` consolida chaves, rotação, migrations, cookies, limpeza e gate pré-deploy.

## 16. Rotas HTTP

As rotas implementadas são geradas dinamicamente pelo Swagger em `/docs` e têm prefixo `/api`. A fonte de verdade executável são os controllers em `backend/src/modules/*/http/`; não existe arquivo OpenAPI estático versionado.

Boundaries implementados:

- autenticação e sessão: `/api/auth/*` e `/api/session`;
- plataforma: `/api/platform/tenants/*`, `/api/platform/programs/*` e habilitação por tenant;
- organizações: `/api/teams` e `/api/memberships`;
- convites: `/api/invitations/*`;
- catálogo empresarial: `/api/programs`;
- execução: `/api/enrollments/*`, incluindo fatos objetivos e respostas privadas.
- reporting objetivo: `/api/reports/me`, `/api/reports/teams/:teamId`, `/api/reports/tenant` e `/api/reports/inactive-members`.

Controllers implementam métodos `PUT`, e a allowlist CORS os anuncia em preflight sem ampliar origens ou headers permitidos. A reconciliação foi comprovada por teste E2E na B6.1 e encerrou o PP-017.

## 17. Estrutura atual do frontend

O inventário detalhado dos protótipos, o mapa de componentes e a ordem operacional da migração estão em [`docs/MIGRACAO_FRONTEND.md`](docs/MIGRACAO_FRONTEND.md).

```text
frontend/src/
├── app/
│   ├── layouts/
│   └── providers/
├── modules/
│   ├── auth/
│   ├── daily-ritual/
│   ├── discipline-content/
│   ├── dashboard/
│   ├── gamification/
│   ├── profile/
│   ├── programs/
│   └── projeto66/
├── App.jsx
└── main.jsx
```

Rotas atuais da plataforma: `/login`, `/app`, `/app/ritual`, `/app/missoes`, `/app/conquistas`, `/app/protocolo`, `/app/programas`, `/app/programas/projeto66`, `/app/minha-evolucao` e `/app/perfil`.

O Projeto 66 e a gamificação possuem módulos e adapters HTTP próprios. Tracker e ritual ainda usam repositories locais; componentes não dependem diretamente do mecanismo de persistência.

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

B0–B7 estão concluídas. A próxima entrega é B8; B9–B10 permanecem planejadas.

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
| 16/07/2026 | Registro central de problemas postergados criado em `docs/PROBLEMAS_POSTERGADOS.md`, com prioridades, mitigação, fase de retomada e gates para dados reais/staging. |
| 20/07/2026 | B1.4 concluída: JWT RS256 por kid, refresh opaco rotativo, expiração 7/30 dias, revogação e reuse detection transacional. |
| 20/07/2026 | B1.5 concluída: contrato HTTP de login/refresh/logout, origem exata, cookies por ambiente, CSRF ligado à sessão e refresh single-flight documentado. |
| 20/07/2026 | B1.6 concluída: autenticação privada por padrão, principal mínimo, revalidação atual de usuário/sessão e boundaries separados para tenant e plataforma. |
| 20/07/2026 | B1.7 e fase B1 concluídas: retenção/limpeza idempotente, pisos de cobertura, action Sonar fixada por SHA, runbook operacional e gate integral. |
| 23/07/2026 | B2 concluída: organizações, times, memberships, lifecycle, autorização por role e escopo e isolamento multi-tenant provados em PostgreSQL e E2E. |
| 25/07/2026 | B3 concluída: convites nominais com token opaco, consumo transacional único, primeiro CEO, entrega SMTP local e matriz E2E integral. |
| 25/07/2026 | B4.0 concluída no ADR 013: catálogo global, publicação imutável, habilitação por tenant e `Enrollment AVAILABLE` idempotente foram fechados antes do schema. |
| 25/07/2026 | B4.1 concluída: quarta migration materializa catálogo, versões, fases, atividades, habilitação e disponibilidade com índices parciais, triggers imutáveis e FKs compostas. |
| 25/07/2026 | B4.2 concluída: administração global, cópia de versão, publicação concorrente, arquivamento e auditoria implementados no módulo `programs`. |
| 25/07/2026 | B4.3 concluída: habilitação por tenant e provisionamento idempotente de `Enrollment AVAILABLE` implementados e provados sob concorrência. |
| 25/07/2026 | B4.4 concluída: entrada e reativação compartilham provisionamento transacional; catálogo empresarial efetivo e isolado exposto para todas as roles ativas. |
| 25/07/2026 | B4 concluída com B4.5: matriz E2E prova autoria, imutabilidade, disponibilidade idempotente, entrada posterior, roles e isolamento em banco reconstruído do zero. |
| 25/07/2026 | B5.0 concluída no ADR 014: lifecycle de execução, causas de pausa, fatos objetivos, privacidade, contratos HTTP e concorrência fechados antes do schema. |
| 25/07/2026 | B5.1 concluída: quinta migration materializa lifecycle, pausas e causas, fatos objetivos e respostas privadas com invariantes estruturais. |
| 25/07/2026 | B5.2 concluída: início transacional, leitura individual, calendário IANA, conclusão idempotente e abandono implementados no módulo `execution`. |
| 25/07/2026 | B5.3 concluída: pausas pessoais, causas simultâneas e bloqueios administrativos atômicos integrados ao lifecycle organizacional. |
| 25/07/2026 | B5.4 concluída: configuração tipada, fatos objetivos idempotentes e respostas privadas em fronteira exclusiva, validados por regressão integral em banco vazio. |
| 25/07/2026 | B5.5.0 concluída: projeção objetiva de leitura e adapter HTTP do Projeto 66 implementados sem exposição de conteúdo privado. |
| 25/07/2026 | B5.5.1 concluída: semântica append-only refletida no checklist e jornada HTTP autenticada provada até o dia 66. |
| 25/07/2026 | B5.5.2 concluída: sessão frontend real, bootstrap de organizações e provider HTTP substituem a fonte local do ciclo objetivo. |
| 25/07/2026 | B5.5.3 concluída: ferramentas privadas migram para atividades próprias, respostas ONCE persistem no ciclo e repositories locais do Projeto 66 são removidos. |
| 25/07/2026 | B5.5.4 e B5 concluídos: definição editorial compatível, materialização idempotente e regressões integrais aprovadas em banco vazio. |
| 26/07/2026 | B6.0 concluída: ADR 015 adota outbox PostgreSQL transacional, entrega ao menos uma vez, consumidores idempotentes, gamificação por membership e auditoria crítica síncrona. |
| 26/07/2026 | B6.1 concluída: sétima migration materializa eventos append-only e entregas idempotentes com lease recuperável; o preflight CORS para `PUT` encerra o PP-017. |
| 26/07/2026 | B6.2 concluída: execução publica eventos objetivos atomicamente e o dispatcher processa com claim concorrente, lease, retry limitado e reprocessamento auditado. |
| 26/07/2026 | B6.3 concluída: ledger e conquistas server-side são imutáveis, idempotentes, derivados de fatos objetivos e isolados por tenant/membership. |
| 26/07/2026 | B6.4 concluída: auditoria derivada idempotente e leituras pessoal, time e tenant com projeção segura e escopo revalidado. |
| 26/07/2026 | Governança do PP-004 aprovada: responsabilidades técnicas, empresariais e jurídicas foram separadas; retenção de tenant e auditoria, anonimização e atendimento ao titular foram registrados sem alterar a arquitetura de lifecycle. |
| 03/08/2026 | ADR 016 aprovou fornecedores e parâmetros operacionais iniciais do MVP, incluindo Railway, Cloudflare R2, Resend, OpenTelemetry para instrumentação, Sentry para exceções/performance, BetterStack para disponibilidade/alertas, RPO/RTO e sequência staging–produção; validações e escolhas explicitamente pendentes permaneceram abertas. |

## 21. Versionamento e documentação

O repositório remoto oficial é `EduSobreiraa/Disciplina-PRO`, com desenvolvimento principal na branch `main` enquanto o projeto estiver em fase inicial individual.

Cada conjunto coerente de mudanças deve:

1. atualizar `ARQUITETURA.md` quando afetar módulos, entidades, ownership, segurança, privacidade, contratos ou decisões estruturais;
2. atualizar [`GOVERNANCA.md`](GOVERNANCA.md) quando afetar responsabilidades, políticas da Spark ou dependências jurídicas;
3. atualizar `docs/MIGRACAO_FRONTEND.md` quando alterar o progresso ou a estratégia da migração;
4. manter o `README.md` alinhado aos comandos, estrutura e estado público do projeto;
5. executar lint, testes e build proporcionais à mudança;
6. realizar validação mobile-first no navegador para mudanças visuais, quando o ambiente permitir;
7. revisar o diff e excluir credenciais, configurações locais e artefatos gerados;
8. criar commit descritivo e enviar ao remoto somente após as validações.

Commits devem representar unidades compreensíveis de trabalho. Não incluir `.env`, relatórios de teste, builds, caches, perfis de navegador ou outros dados locais.

Mudanças exclusivamente em Markdown acionam o workflow documental de links e comandos, mas não o gate funcional completo, cobertura ou SonarQube.

---

Este é um documento vivo. Toda alteração relevante de módulos, ownership, entidades, permissões, privacidade, eventos ou contratos deve atualizá-lo no mesmo conjunto de mudanças.
