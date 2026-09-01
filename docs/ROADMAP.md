# Roadmap do Disciplina PRO

> Spark Inteligência Corporativa · Atualizado em 01/09/2026
> Escopo: conclusão do MVP B2B SaaS multi-tenant, do estado atual até o primeiro release controlado.

## 1. Estado atual verificado

- frontend individual F0–F9 concluído e validado em React;
- B0, decisões B0.5 e fases B1–B5 concluídas e validadas localmente;
- B6.0–B6.5 concluídas: eventos, gamificação server-side, consultas seguras de auditoria e integração frontend;
- onze migrations reproduzidas em banco PostgreSQL vazio;
- autenticação real e integração HTTP do Projeto 66 implementadas;
- tracker, ritual, gamificação e missões consomem fontes ou projeções server-side;
- B7.1–B7.4 concluídas: reporting pessoal, por time e tenant com contratos e prova HTTP de privacidade;
- B8.1–B8.4 e B9.1–B9.7 concluídas;
- BX.1, BX.2 e BX.3 concluídas no recorte de laboratório, incluindo deploy, backup/restore e segurança/configuração externa;
- BX.4 em andamento: Sentry, Better Stack, heartbeat automático do backup e worker contínuo de eventos comprovados; limpeza de sessões, OpenTelemetry e runbook ainda pendentes;
- PITR e restore dentro da infraestrutura Railway permanecem como risco residual obrigatório antes do lançamento e não são substituídos pelo dump diário.

O roadmap é sequencial por dependência, não uma promessa de datas. Uma fase só é encerrada quando seus critérios de saída estiverem atendidos, testados e documentados.

Riscos e dívidas conscientemente adiados são acompanhados separadamente em [`PROBLEMAS_POSTERGADOS.md`](PROBLEMAS_POSTERGADOS.md).

## 2. Ordem de implementação

```text
B0 Fundação técnica
  ↓
B0.5 Decisões arquiteturais
  ↓
B1 Persistência e Identity Access
  ↓
B2 Organizações e multi-tenancy
  ↓
B3 Convites e entrada de membros
  ↓
B4 Catálogo e habilitação de programas
  ↓
B5 Execução e Projeto 66
  ↓
B6 Eventos, gamificação e auditoria
  ↓
B7 Reporting e privacidade
  ↓
B8 Integração do frontend
  ↓
B9 Administração da plataforma
  ↓
BX Preparação pré-staging em laboratório
  ↓
B10 Hardening, staging e release MVP
```

## 3. Fases e estado

### B0 — Fundação técnica ✅

**Objetivo:** tornar a API previsível, testável e pronta para receber o domínio.

Concluída em 15/07/2026 com:

- configuração tipada e validada por ambiente;
- `compose.yaml` com PostgreSQL e health check;
- filtro e contrato padronizado de erros;
- request ID e limite explícito de payload;
- conexão técnica por `pg`, sem antecipar o schema ou o `PrismaModule` da B1;
- teste de integração com PostgreSQL real;
- CI com lint, typecheck, testes, build e auditoria de dependências.

**Gate de saída aprovado:** ambiente versionado, API e PostgreSQL verificáveis, checks locais aprovados e workflow de CI criado. A execução remota do workflow será confirmada no GitHub após o push.

### B0.5 — Decisões arquiteturais

**Objetivo:** fechar os contratos que determinam o primeiro schema e a segurança da sessão.

Esta fase contém exclusivamente:

1. `ProgramVersion`: imutabilidade, publicação, arquivamento e vínculo do enrollment;
2. `EnrollmentPause`: intervalos, retomada, cálculo de dia e casos de borda;
3. `TenantMembership`: estados, transições, reativação e efeitos do desligamento;
4. `SUPER_ADMIN`: representação fora de `TenantRole` e bootstrap seguro;
5. IDs: formato, geração, exposição pública e índices;
6. timezone: armazenamento, calendário do tenant e cálculo de `programDay`;
7. soft delete: quais entidades usam, unicidade, retenção e restauração;
8. JWT: claims mínimas, duração, audience/issuer e chaveamento;
9. refresh token: rotação, revogação, reuse detection e persistência;
10. CORS/CSRF: origens, cookies, credenciais e proteção conforme o transporte escolhido.

Progresso: **10/10 decisões aprovadas** nos ADRs 001–010. O gate da B0.5 está concluído e libera o primeiro schema, migration e `identity-access` na B1.

Entregáveis:

- decisões registradas em `ARQUITETURA.md` ou ADRs vinculados;
- invariantes e transições documentadas;
- ameaças e escolhas de autenticação explicitadas;
- checklist B0.5 integralmente aprovado.

**Gate de saída:** nenhuma das dez decisões permanece ambígua. Em seguida, escreve-se o primeiro `schema.prisma`, gera-se a primeira migration e inicia-se `identity-access`.

### B1 — Persistência e Identity Access

**Objetivo:** estabelecer dados persistentes, identidade e sessões seguras.

#### B1.1 — Contrato do primeiro schema

**Objetivo:** traduzir os ADRs para o modelo Prisma antes de gerar SQL.

Entregas:

- instalar e fixar o Prisma CLI em versão compatível e auditada;
- definir generator, datasource, enums, IDs UUIDv7 e tipos temporais;
- modelar `User`, `Tenant`, `TenantMembership`, `PlatformAccess`, `AuthSession` e `RefreshToken`;
- representar constraints, índices e relações exigidos pelos ADRs 001–010;
- documentar invariantes que exigirão SQL manual ou casos de uso.

**Gate:** `schema.prisma` formata e valida; nenhuma migration é criada antes da revisão do modelo.

**Estado:** concluído em 16/07/2026.

#### B1.2 — Baseline de banco e PrismaModule

**Objetivo:** transformar o contrato revisado em persistência reproduzível.

Entregas:

- gerar e revisar a primeira migration SQL;
- acrescentar UUIDv7, checks e índices parciais não expressáveis diretamente no Prisma;
- aplicar a migration em banco vazio e reaplicá-la em banco descartável;
- criar `PrismaModule` global com adapter `pg`, shutdown limpo e configuração validada;
- adicionar comandos de generate, migrate e verificação de drift apropriados ao ambiente.

**Gate:** um banco vazio chega ao schema esperado somente pelas migrations versionadas e a aplicação abre/fecha conexões corretamente.

**Estado:** concluído em 16/07/2026.

#### B1.3 — Identidade e credenciais

**Objetivo:** estabelecer identidade global sem misturar role empresarial em `User`.

Entregas:

- repositories e casos de uso mínimos de `User`;
- normalização e unicidade de e-mail;
- hashing e verificação de senha com Argon2id;
- política de senha e contrato de erros preparado para não enumerar contas;
- bootstrap operacional do primeiro `PlatformAccess`, sem endpoint público.

**Gate:** credenciais nunca são persistidas ou logadas em texto puro; bootstrap é único, auditável e testado.

**Estado:** concluído em 16/07/2026.

#### B1.4 — Núcleo de sessões

**Objetivo:** implementar emissão e revogação independentemente do transporte HTTP.

Entregas:

- `AuthSession` e famílias de `RefreshToken` opaco;
- access token JWT `RS256` conforme o ADR 008;
- rotação transacional, expiração, logout e revogação global;
- detecção de reutilização com revogação da família;
- rotação de chaves por `kid` e redação integral de segredos em logs.

**Gate:** testes de domínio e integração provam emissão, rotação única, concorrência, reuse detection e revogação imediata.

**Estado:** concluído em 20/07/2026.

#### B1.5 — Contrato HTTP de autenticação

**Objetivo:** expor a sessão ao frontend com transporte seguro.

Entregas:

- `POST /auth/login`, `POST /auth/refresh` e `POST /auth/logout`;
- cookies `__Host-`, flags por ambiente e token CSRF assinado;
- allowlist CORS exata e validação de `Origin`;
- DTOs, erros estáveis, OpenAPI e integração com throttling;
- respostas de autenticação sem enumeração de contas;
- fluxo de refresh single-flight documentado para o frontend.

**Gate:** E2E cobre sucesso e rejeição de origem, cookie, CSRF, expiração, replay e logout.

**Estado:** concluído em 20/07/2026.

#### B1.6 — AuthenticationGuard e principal atual

**Objetivo:** fornecer identidade autenticada confiável aos módulos seguintes.

Entregas:

- `AuthenticationGuard` valida JWT, usuário e sessão atuais;
- objeto `CurrentPrincipal` tipado, sem role ou tenant embutidos;
- decorators mínimos para acesso ao principal;
- contrato de `X-Tenant-Id` preparado, sem antecipar autorização organizacional da B2;
- boundary separado para futura validação de `PlatformAccess`.

**Gate:** rotas protegidas rejeitam tokens inválidos, sessões revogadas e usuários desabilitados; nenhuma autorização confia somente em claims.

**Estado:** concluído em 20/07/2026.

#### B1.7 — Hardening e encerramento

**Objetivo:** provar que persistência e sessão estão prontas para organizações.

Entregas:

- testes unitários, integração PostgreSQL real e E2E dos fluxos críticos;
- casos de concorrência, falha transacional e limpeza de sessões expiradas;
- cobertura, lint, typecheck, build, migration check e auditoria de dependências;
- documentação operacional de chaves, bootstrap, cookies e migrations;
- atualização de arquitetura, relatório, OpenAPI e checklist.

**Gate:** sessão pode ser criada, renovada e revogada sem expor segredos; migrations funcionam em banco vazio; CI e Quality Gate são aprovados.

**Gate de saída:** sessão pode ser criada, renovada e revogada sem expor segredos; migrations funcionam em banco vazio.

**Estado:** concluído em 20/07/2026. A fase B1 está encerrada.

### B2 — Organizações e isolamento multi-tenant

**Objetivo:** implementar tenants, memberships, times e autorização por role mais escopo.

Entregas:

- lifecycle de tenant e membership;
- times e `TeamMembership`;
- `TenantContextGuard` e `PermissionGuard`;
- casos de uso de CEO e Manager respeitando escopo;
- repositories obrigatoriamente filtrados por `tenantId`;
- testes negativos de acesso cruzado entre tenants e times.

#### B2.0 — Contrato organizacional

**Objetivo:** fechar modelo, lifecycle, matriz de autorização, erros e fronteiras antes da migration.

Entregas:

- `Team`, `TeamMembership` e `TeamRole` definidos;
- vínculo cruzado entre tenants impedido por integridade referencial composta;
- contexto confiável de tenant e contrato de erros definidos;
- permissions cumulativas separadas do escopo do recurso;
- responsabilidades de B2 e B3 delimitadas;
- auditoria mínima organizacional definida no ADR 011.

**Gate:** nenhuma decisão necessária ao schema ou aos guards permanece implícita.

**Estado:** concluído em 21/07/2026.

#### B2.1 — Schema e migration organizacional

**Objetivo:** materializar times e invariantes multi-tenant no PostgreSQL.

Entregas:

- modelos Prisma de `Team` e `TeamMembership`;
- enums, relações, índices e unicidades do ADR 011;
- chaves estrangeiras compostas impedindo associações entre tenants;
- índice parcial para nome ativo normalizado;
- migration revisada e testes reais de constraints.

**Gate:** banco vazio reproduz o schema e rejeita vínculos de time cruzados mesmo fora dos casos de uso.

**Estado:** concluído em 21/07/2026.

#### B2.2 — Contextos e guards

**Objetivo:** transformar identidade autenticada em contexto empresarial ou de plataforma confiável.

Entregas:

- `OrganizationsModule` e boundaries;
- `TenantContextGuard` e `CurrentTenantContext`;
- `PlatformAccessGuard` e contexto de plataforma;
- `PermissionGuard`, metadata e catálogo tipado de permissions;
- erros estáveis e documentação OpenAPI.

**Gate:** header, JWT ou `SUPER_ADMIN` isoladamente nunca concedem contexto empresarial.

**Estado:** concluído em 21/07/2026.

#### B2.3 — Casos de uso organizacionais

**Objetivo:** implementar lifecycle de tenants, memberships e times com role mais escopo.

Entregas:

- administração de tenant pela plataforma;
- criação, alteração, arquivamento e restauração de times pelo CEO;
- atribuição e encerramento de membros e managers de time;
- suspensão, inativação, reativação e mudança de role conforme ADR 004;
- substituição atômica de CEO elegível;
- auditoria na mesma transação das alterações.

**Gate:** Manager não extrapola times administrados; CEO não extrapola o tenant; plataforma não ganha acesso empresarial implícito.

**Estado:** concluído em 23/07/2026.

- **B2.3.1 — lifecycle de tenant pela plataforma: concluído.** Criação em `PENDING`, suspensão, reativação condicionada a exatamente um CEO ativo e encerramento definitivo possuem validação, erros HTTP estáveis, auditoria atômica e serialização de transições concorrentes.
- **B2.3.2 — lifecycle e administração de times pelo CEO: concluído.** Listagem corrente, criação, renomeação, arquivamento e restauração possuem escopo explícito de tenant, nomes normalizados, auditoria atômica e serialização concorrente. Arquivar encerra e audita todos os vínculos ativos sem reativá-los na restauração.
- **B2.3.3 — vínculos, managers e substituição atômica de CEO: concluído.** Manager lista e administra somente USER de time atualmente gerenciado, com escopo histórico restrito à reativação; CEO administra vínculos, suspensão, lifecycle e roles `USER ↔ MANAGER` no tenant. Inativação encerra vínculos, reativação não os recupera, e substituição de CEO pela plataforma usa compare-and-swap transacional para preservar exatamente um CEO ativo sob concorrência.

#### B2.4 — Prova de isolamento e encerramento

**Objetivo:** provar as barreiras em domínio, persistência e HTTP.

Entregas:

- testes unitários da matriz de permissions;
- integração PostgreSQL de constraints e concorrência;
- E2E positivo e negativo entre dois tenants e dois times;
- testes de mudanças de estado com efeito imediato;
- atualização de arquitetura, OpenAPI e problemas postergados.

**Gate:** `PP-001` e `PP-003` atendem seus critérios objetivos de encerramento.

**Gate de saída:** nenhuma operação empresarial acessa outro tenant; permissões cumulativas e escopo estão cobertos por testes.

**Estado:** concluído em 23/07/2026. A matriz E2E usa dois tenants, três times e identidades `USER`, `MANAGER`, `CEO` e `SUPER_ADMIN`; cobre autenticação, logout/revogação, seleção malformada, ausência de membership, recursos cruzados, escopo nominal, alteração imediata de role/status, suspensão de tenant e contrato OpenAPI. `PP-001` e `PP-003` foram encerrados.

**Estado da fase B2:** concluída em 23/07/2026.

### B3 — Convites e entrada de membros

**Objetivo:** permitir entrada nominal e auditável em empresas e times.

Entregas:

- `Invitation` e `InvitationTeam`;
- token opaco com hash, expiração, revogação e uso único;
- criação ou reutilização segura de `User`;
- criação transacional de memberships;
- limites de convite para Manager e CEO;
- Mailpit no desenvolvimento e eventos de auditoria essenciais.

**Gate de saída:** aceitar o mesmo convite duas vezes é impossível e Managers não extrapolam seus times.

#### B3.0 — Contrato de convite e entrada

**Objetivo:** fechar lifecycle, token, concorrência, atores, aceitação e fronteira SMTP antes do schema.

**Entregas:** ADR 012; caminhos separados para identidade nova/existente; primeiro CEO; unicidades e FKs compostas; erros e auditoria; estratégia Mailpit.

**Estado:** concluído em 23/07/2026.

#### B3.1 — Schema e migration

**Objetivo:** materializar `Invitation`, `InvitationTeam`, enums, índices parciais, constraints e relações compostas.

**Gate:** banco vazio reproduz o schema e rejeita convite/time cruzado, criador ambíguo e lifecycle temporal inválido.

**Estado:** concluído em 23/07/2026. `Invitation`, `InvitationTeam`, `InvitationStatus`, índice parcial pendente, hash único, criador exclusivo por role, timestamps e FKs compostas foram aplicados e provados em PostgreSQL vazio.

#### B3.2 — Token, criação e revogação

**Objetivo:** implementar token opaco, criação/listagem/reenvio/revogação e escopo de CEO/Manager/plataforma.

**Gate:** token nunca é persistido ou auditado em claro; Manager não convida fora dos times administrados.

**Estado:** concluído em 23/07/2026. O backend gera 32 bytes por CSPRNG, persiste apenas HMAC-SHA-256 com pepper próprio, oferece administração nominal por tenant e primeiro CEO por plataforma, gira o segredo no reenvio e impõe ownership/escopo dentro da transação.

#### B3.3 — Aceitação transacional

**Objetivo:** criar ou reutilizar identidade com segurança, consumir convite uma única vez e compor memberships/times/primeiro CEO.

**Gate:** duas aceitações concorrentes produzem exatamente uma membership e um evento de aceitação.

**Estado:** concluído em 23/07/2026. Conta nova define senha sem aceitar e-mail do cliente; conta existente exige sessão ativa com o mesmo e-mail; `FOR UPDATE` serializa o consumo e a mesma transação cria membership/times, aceita o convite, audita e ativa o tenant do primeiro CEO.

#### B3.4 — Mailpit e entrega local

**Objetivo:** adicionar port de e-mail, adapter SMTP, Mailpit no Compose e reenvio recuperável.

**Gate:** fluxo local completo entrega mensagem sem expor token em log, banco ou auditoria.

**Estado:** concluído em 25/07/2026. Mailpit `v1.30.5` está fixado no Compose, Nodemailer `9.0.3` implementa o cliente SMTP, o link transporta o token somente no fragmento e o gate `test:mailpit` valida a mensagem real. Falha SMTP permanece pós-commit e o reenvio gira o token.

#### B3.5 — Prova E2E e encerramento

**Objetivo:** validar convites de CEO, Manager, conta nova/existente, expiração, revogação, concorrência e primeiro CEO.

**Gate de saída:** aceitar o mesmo convite duas vezes é impossível e Managers não extrapolam seus times.

**Estado:** concluído em 25/07/2026. A matriz E2E percorre criação, entrega capturada no port SMTP e aceitação pela API; comprova primeiro CEO e ativação do tenant, identidades nova e existente, preservação de senha, consumo concorrente único, atribuição de time, escopo de Manager, rotação, revogação e expiração. O banco descartável foi reconstruído pelas três migrations e todas as suítes de integração e E2E passaram.

**Estado da fase B3:** concluída em 25/07/2026. O gate funcional está satisfeito; riscos externos de provedor SMTP e advisories de tooling continuam governados por `PP-015` e `PP-016`, sem autorização para staging enquanto o P1 permanecer aberto.

### B4 — Catálogo e habilitação de programas

**Objetivo:** administrar programas globais e sua disponibilidade por tenant.

Entregas:

- `Program`, versões, fases, atividades e `TenantProgram`;
- publicação imutável conforme B0.5;
- habilitação por `SUPER_ADMIN`;
- enrollment `AVAILABLE` automático para membros ativos e novos convidados;
- contratos de leitura para catálogo e detalhes.

**Gate de saída:** habilitar um programa cria disponibilidade idempotente sem acoplar o Projeto 66 ao núcleo.

#### B4.0 — Contrato de catálogo e disponibilidade

**Objetivo:** fechar ownership, árvore editorial, lifecycle, habilitação, enrollment mínimo, concorrência, autorização, erros e auditoria antes do schema.

**Entregas:** ADR 013; fronteiras de plataforma/tenant; contrato transacional entre aceitação de convite e provisionamento; decomposição B4.1–B4.5.

**Estado:** concluído em 25/07/2026.

#### B4.1 — Schema e migration

**Objetivo:** materializar enums, `Program`, `ProgramVersion`, fases, atividades, `TenantProgram` e o `Enrollment AVAILABLE` mínimo.

**Gate:** banco vazio reproduz o schema e rejeita duas versões draft/publicadas, árvores cruzadas, relação tenant/programa duplicada e enrollment fora do tenant.

**Estado:** concluído em 25/07/2026. A quarta migration materializa catálogo, árvore versionada, habilitação e disponibilidade com UUIDv7, checks de lifecycle, índices parciais para um único draft/publicado, triggers de imutabilidade e FKs compostas de tenant, versão e programa. O banco vazio e 15 suítes/44 testes de integração provaram as invariantes e a regressão.

#### B4.2 — Administração e publicação global

**Objetivo:** implementar criação/edição, cópia de nova versão, validação, publicação e arquivamento pela fronteira de plataforma.

**Gate:** duas publicações concorrentes preservam exatamente uma versão corrente e nenhuma árvore publicada pode ser alterada.

**Estado:** concluído em 25/07/2026. O módulo `programs` expõe somente a fronteira de plataforma para criar/editar identidade e draft, copiar a publicação para uma nova versão, publicar e arquivar. Locks consultivos serializam programa e releem estado atual; publicação dupla e criação dupla de sucessor produzem exatamente um sucesso, enquanto triggers preservam árvores publicadas e auditoria registra somente IDs e contagens.

#### B4.3 — Habilitação e provisionamento

**Objetivo:** habilitar/desabilitar por plataforma e criar ofertas para memberships ativas com reexecução e concorrência seguras.

**Gate:** duas habilitações concorrentes criam um único `TenantProgram`, uma oferta por membership e um evento de transição.

**Estado:** concluído em 25/07/2026. A fronteira de plataforma habilita/desabilita com lock por tenant/programa, valida tenant/programa/publicação atuais e provisiona memberships e usuários ativos por `INSERT ... ON CONFLICT DO NOTHING`. Repetições são idempotentes, transições auditam uma vez, desabilitação preserva ofertas e reabilitação completa disponibilidades ausentes.

#### B4.4 — Entrada e leitura empresarial

**Objetivo:** integrar aceitação/reativação ao provisionamento e expor catálogo/detalhe efetivamente disponível no contexto do tenant.

**Gate:** habilitação concorrente com novo membro cria a oferta exatamente uma vez; tenant desabilitado ou estrangeiro não aparece na leitura.

**Estado:** concluído em 25/07/2026. Um provisionador transacional único atende habilitação, aceitação de convite e reativação, com lock consultivo por tenant e `ON CONFLICT DO NOTHING`. As rotas empresariais `GET /api/programs` e `GET /api/programs/:programId` derivam o catálogo do tenant, programa, habilitação e publicação atuais, incluem a oferta do membro e nunca expõem habilitações desativadas ou de outro tenant.

#### B4.5 — Prova E2E e encerramento

**Objetivo:** validar autoria, publicação, imutabilidade, habilitação, desabilitação, entrada posterior, roles e isolamento.

**Gate de saída:** habilitar um programa cria disponibilidade idempotente sem acoplar o Projeto 66 ao núcleo.

**Estado:** concluído em 25/07/2026. A matriz E2E cria e publica pela fronteira de plataforma, prova imutabilidade no PostgreSQL, habilita e desabilita concorrentemente, verifica ofertas para `CEO`, `MANAGER` e `USER`, aceita entrada posterior uma única vez e mantém outro tenant e o acesso de plataforma fora da leitura empresarial.

**Estado da fase B4:** concluída em 25/07/2026. O catálogo global versionado, a publicação imutável, a habilitação por tenant, o provisionamento transacional e a leitura empresarial satisfazem o gate em banco reconstruído do zero. A regressão final aprovou 49 testes de integração e 18 E2E.

### B5 — Execução e Projeto 66

**Objetivo:** persistir ciclos e fatos de execução por contratos genéricos.

Entregas:

- lifecycle de `Enrollment` e histórico de pausas;
- `ActivityCompletion`, `DailyRecord` e `PillarScore`;
- cálculo reproduzível de dia, progresso e streak;
- idempotência e unicidades por dia/atividade;
- separação física e contratual de conteúdo privado;
- endpoints necessários para substituir repositories locais do Projeto 66.

**Gate de saída:** um ciclo de 66 dias pode ser iniciado, pausado, retomado e concluído com fatos recalculáveis.

#### B5.0 — Contrato de execução

**Objetivo:** fechar lifecycle, início transacional, calendário civil, causas simultâneas de pausa, fatos objetivos, privacidade, rotas, autorização e concorrência.

**Entregas:** ADR 014 e decomposição B5.1–B5.5.

**Estado:** concluído em 25/07/2026. O contrato mantém execução genérica, fixa versão e timezone no início, separa intervalo de pausa de suas causas, deriva progresso de fatos e isola respostas privadas em tabela, repository e rotas próprios.

#### B5.1 — Schema e migration de execução

**Objetivo:** materializar lifecycle completo, pausas e causas, conclusões de atividade, registros diários, scores e respostas privadas.

**Gate:** banco vazio rejeita ciclo ativo duplicado, pausa aberta duplicada, fatos cruzados entre versões/tenants e duplicidade de ocorrência ou dia.

**Estado:** concluído em 25/07/2026. A quinta migration materializa lifecycle terminal, intervalos e causas de pausa, conclusões, registros diários, scores e respostas privadas. Índices parciais impedem ciclo ou pausa corrente duplicados; FKs compostas preservam tenant e versão; fatos objetivos e intervalos encerrados são imutáveis.

#### B5.2 — Início, calendário e encerramento

**Objetivo:** iniciar atomicamente na publicação corrente, calcular dia civil reproduzível e implementar leitura, conclusão e abandono.

**Gate:** início concorrente fixa uma versão; mudança de timezone/publicação posterior não altera o ciclo; dias 1 e final são reproduzíveis.

**Estado:** concluído em 25/07/2026. O módulo `execution` separa portas de consulta e lifecycle, fixa publicação, timezone e data civil sob lock transacional compartilhado com a publicação, calcula dias por calendário IANA sem divisão de milissegundos e expõe leitura, início, conclusão idempotente e abandono. Motivos de abandono são persistidos no ciclo, mas não copiados para auditoria.

#### B5.3 — Pausas e bloqueios administrativos

**Objetivo:** implementar intervalos, causas simultâneas e integração síncrona com membership e tenant.

**Gate:** causas concorrentes compartilham um intervalo e nenhuma retomada ocorre enquanto restar bloqueio aberto.

**Estado:** concluído em 25/07/2026. Pausas pessoais são idempotentes e começam no dia civil seguinte; retomada resolve apenas a causa pessoal e permanece bloqueada diante de outra causa. Suspensão/inativação de membership, substituição de CEO e suspensão/fechamento de tenant adicionam causas administrativas na mesma transação, e reativação nunca as resolve implicitamente.

#### B5.4 — Fatos objetivos e respostas privadas

**Objetivo:** persistir conclusões, registros, scores e conteúdo privado por fronteiras separadas.

**Gate:** reexecução não duplica fatos; atividade de outra versão é rejeitada; nenhum DTO, log ou evento objetivo contém payload privado.

**Estado:** concluído em 25/07/2026. `ProgramVersion.executionConfiguration` declara pilares e limites do registro diário, e configurações de atividade usam allowlists tipadas. Conclusões e registros são fatos idempotentes, validados contra a versão congelada e datados pelo servidor. Respostas privadas possuem repository, controller, DTOs e auditoria próprios; o payload substituível nunca integra metadata objetiva. A sexta migration foi validada junto das anteriores em banco vazio, e a regressão integral aprovou 20 suítes e 60 testes de integração.

#### B5.5 — Integração do Projeto 66 e prova E2E

**Objetivo:** substituir repositories locais do ciclo por adapters HTTP e provar a jornada completa com projeções recalculáveis.

**Gate de saída:** um ciclo de 66 dias pode ser iniciado, pausado, retomado e concluído com fatos recalculáveis.

**Decomposição planejada:**

- **B5.5.0 — Projeção e adapter:** expor a leitura objetiva sem payload privado e criar o adapter HTTP do Projeto 66. Gate: estado do ciclo é reconstruído somente de fatos retornados pela API.
- **B5.5.1 — Semântica e E2E:** reconciliar a UX com fatos append-only e provar a jornada HTTP autenticada. Gate: idempotência, pausa, retomada, privacidade, isolamento e conclusão no dia 66 passam em E2E.
- **B5.5.2 — Sessão e ativação:** implementar bootstrap da sessão empresarial, refresh single-flight e provider remoto. Gate: telas objetivas deixam de usar repository local e access token nunca é persistido.
- **B5.5.3 — Ferramentas privadas:** migrar registro pessoal, meditação, Novo Eu e crise para atividades privadas próprias. Gate: o módulo Projeto 66 não contém `localStorage` e respostas `ONCE` permanecem acessíveis no ciclo.
- **B5.5.4 — Definição editorial e encerramento:** versionar a definição executável completa, materializá-la idempotentemente e provar compatibilidade com todas as chaves consumidas pelo frontend. Gate: catálogo publicado pode alimentar todas as telas sem atividade ausente, e a regressão integral encerra a B5.

**Dependências do B5.5.4:** catálogo e publicação B4, configuração tipada B5.4, chaves funcionais estabilizadas no frontend e execução das seis migrations. A materialização não poderá alterar silenciosamente uma versão publicada nem habilitar o programa para tenants sem comando explícito.

**Estado:** concluído em 25/07/2026 com B5.5.0–B5.5.4. Projeção, adapter HTTP, semântica append-only, sessão frontend, ferramentas privadas e jornada E2E substituíram integralmente os repositories locais do Projeto 66. A definição editorial versionada contém 66 dias, três fases, seis pilares e todas as atividades consumidas pelas telas. Sua CLI cria/publica uma única vez, aceita repetição idêntica e recusa divergência em catálogo existente. O contrato real de chaves do frontend integra o teste editorial do backend. Em banco reconstruído do zero, 21 suítes/63 testes de integração e 5 suítes/19 testes E2E foram aprovados.

### B6 — Eventos, gamificação e auditoria

**Objetivo:** separar a operação principal de suas consequências internas.

Entregas:

- eventos internos do monolito com handlers idempotentes;
- `XpTransaction` append-only e `UserAchievement`;
- regras iniciais de XP e conquistas em código;
- `AuditEvent` imutável sem conteúdo privado;
- tratamento consistente de falhas e reprocessamento dentro do monolito.

**Gate de saída:** repetir um evento não duplica XP, conquistas ou auditoria.

#### B6.0 — Contrato e planejamento

**Objetivo:** fechar consistência, envelope versionado, ownership, privacidade, idempotência, retry e escopo das regras antes do schema.

**Entregas:** ADR 015 e decomposição B6.1–B6.5.

**Estado:** concluído em 26/07/2026. A decisão adota outbox transacional no PostgreSQL, entrega `at-least-once`, consumidores idempotentes e consequências eventualmente consistentes. Auditoria crítica continua síncrona; eventos usam payload objetivo por allowlist e nunca carregam conteúdo privado.

#### B6.1 — Fundação persistente de eventos

**Objetivo:** materializar eventos duráveis, entregas independentes e invariantes de append-only.

**Problema incorporado:** encerrar `PP-017` antes de ampliar a API: incluir `PUT` no contrato CORS e provar o preflight cross-origin de uma rota real sem enfraquecer a allowlist exata.

**Gate:** banco vazio impõe unicidade da origem e da entrega, impede alteração/destruição e permite recuperar lease expirada sem concorrência duplicada; `PP-017` está encerrado com teste automatizado.

**Estado:** concluído em 26/07/2026. A sétima migration materializa `InternalEvent` append-only e `InternalEventDelivery` com unicidade por origem/consumidor, estados coerentes, lease recuperável e identidade imutável. O CORS passou a anunciar `PUT`, com preflight real exercitado no E2E. Banco reconstruído do zero, 22 suítes/64 testes de integração e 5 suítes/20 testes E2E foram aprovados.

#### B6.2 — Publicação e processamento

**Objetivo:** publicar eventos na transação dos fatos de execução e processá-los com lease, retry e reprocessamento operacional.

**Gate:** queda antes/depois do commit e dois processadores concorrentes não perdem evento nem duplicam consequência.

**Estado:** concluído em 26/07/2026. `execution` publica os três envelopes objetivos do ADR 015 na mesma transação dos fatos. O módulo `events` provisiona entregas por consumidor, reivindica lotes com `SKIP LOCKED`, confirma consequência e entrega atomicamente, recupera leases, limita retry e preserva falhas para reprocessamento auditado pelos comandos operacionais. Banco limpo aprovou 23 suítes/65 testes de integração e 5 suítes/20 testes E2E.

#### B6.3 — Gamificação server-side

**Objetivo:** persistir ledger de XP, conquistas e projeção individual por membership, com regras versionadas em código.

**Gate:** repetição e concorrência não duplicam XP/conquista; saldo e nível são derivados; o cliente nunca define valores.

**Estado:** concluído em 26/07/2026. O ledger append-only concede valores definidos no servidor somente para os três fatos objetivos do ADR 015, valida o fato de origem no mesmo tenant e deriva saldo, nível e conquistas por membership. `GET /api/gamification/me` expõe a projeção individual sem payload privado. Banco vazio aprovou 24 suítes/69 testes de integração e 5 suítes/20 testes E2E.

#### B6.4 — Módulo de auditoria

**Objetivo:** centralizar o contrato seguro de auditoria e expor leituras pessoal, time e tenant com autorização por role e escopo.

**Gate:** auditoria permanece imutável, idempotente quando derivada de evento e não expõe conteúdo privado ou tenant estrangeiro.

**Estado:** concluído em 26/07/2026. O módulo `audit` expõe leituras paginadas pessoal, por time e por tenant com permissões explícitas e revalidação de escopo no repository. A projeção HTTP não inclui `metadata` bruta. Auditorias derivadas possuem referência única ao evento interno e escrita idempotente. Nove migrations foram reproduzidas do zero; 25 suítes/74 testes de integração e 5 suítes/20 testes E2E foram aprovados.

#### B6.5 — Integração e prova E2E

**Objetivo:** integrar a gamificação real ao frontend e provar eventos, falhas, retry, isolamento e privacidade na fronteira HTTP.

**Problema incorporado:** reduzir `PP-002`, removendo o ledger local de gamificação como fonte de verdade. Tracker e ritual permanecem explicitamente para a B8.

**Gate de saída:** repetir ou reprocessar um evento não duplica XP, conquistas ou auditoria; a parcela de gamificação do `PP-002` está encerrada e nenhuma recompensa real depende do browser.

**Estado:** concluído em 26/07/2026. O frontend passou a consumir `GET /api/gamification/me`, removeu o ledger e as regras locais de concessão e deixou de produzir recompensas no browser. A jornada E2E consolidada prova os três fatos objetivos, processamento concorrente, saldo de 560 XP, conquistas, isolamento entre tenants e ausência de conteúdo privado. Tracker e ritual permanecem para B8.

### B7 — Reporting e privacidade

**Objetivo:** oferecer métricas de adesão sem revelar conteúdo íntimo.

Entregas:

- relatórios pessoal, por time e por tenant;
- membros inativos, progresso, registros e agregações;
- escopo nominal para Managers e global para CEO;
- contratos de resposta com allowlist de dados objetivos;
- testes de não exposição de respostas privadas e metadata.

**Gate de saída:** relatórios são derivados de fatos e os testes provam que conteúdo privado não atravessa a fronteira de gestão.

#### B7.1 — Relatório pessoal objetivo

**Objetivo:** expor à membership atual suas contagens de ciclos, atividades concluídas e registros diários, agrupadas pela versão executada.

**Gate:** a consulta revalida ator e tenant, deriva somente fatos objetivos e não seleciona nem serializa respostas privadas.

**Estado:** concluído em 03/08/2026. `GET /api/reports/me` usa permission própria e repository de reporting separado. Banco vazio aprovou a nova prova de isolamento, membership inativa e ausência de conteúdo privado; a regressão completa soma 26 suítes/76 testes de integração e 32 suítes/102 testes unitários.

#### B7.2 — Relatório por time

**Objetivo:** agregar adesão objetiva dos membros de um time, com escopo nominal do Manager e leitura global de times pelo CEO.

**Gate:** Manager não enumera nem consulta time fora de seu vínculo ativo; conteúdo privado permanece inacessível.

**Estado:** concluído em 03/08/2026. `GET /api/reports/teams/:teamId` usa permission própria, retorna somente membros e vínculos ativos e agrega fatos objetivos por membership. Manager é limitado ao vínculo gerencial ativo, CEO lê qualquer time do tenant e ambos recebem `404` não enumerável para escopo ausente ou estrangeiro. Banco vazio aprovou 27 suítes/78 testes de integração e 33 suítes/104 testes unitários.

#### B7.3 — Relatório do tenant e membros inativos

**Objetivo:** oferecer ao CEO agregações do tenant e sinalização objetiva de inatividade, sem inferências sobre conteúdo pessoal.

**Gate:** somente CEO consulta o tenant completo; critérios de inatividade são explícitos e reproduzíveis.

**Estado:** concluído em 03/08/2026. `GET /api/reports/tenant` agrega memberships ativas e fatos objetivos por programa/versão. `GET /api/reports/inactive-members?inactiveSince=<ISO-8601>` exige corte explícito e lista apenas memberships ativas, já existentes no corte, com enrollment e sem conclusão ou registro diário desde então. Administradores sem enrollment não geram falso positivo. Respostas privadas e tenant estrangeiro permanecem fora das consultas. Banco vazio aprovou 28 suítes/80 testes de integração e 33 suítes/104 testes unitários.

#### B7.4 — Contrato e prova consolidada de privacidade

**Objetivo:** consolidar DTOs, OpenAPI e matriz HTTP pessoal/time/tenant com testes negativos de autorização, tenant e payload privado.

**Gate:** todas as respostas usam allowlist objetiva e a suíte prova que `PrivateActivityResponse.payload` e metadata livre não atravessam reporting.

**Estado:** concluído em 03/08/2026. DTOs explícitos documentam todos os campos e formatos das quatro respostas no OpenAPI. A matriz HTTP prova autenticação, permissões USER/Manager/CEO, time não gerenciado, tenant estrangeiro, corte ausente/inválido e respostas positivas. Schemas e corpos foram verificados contra `payload`, `metadata` e `PrivateActivityResponse`. Banco vazio aprovou 28 suítes/82 testes de integração, 33 suítes/104 testes unitários e a regressão E2E integral.

**Estado da fase B7:** concluída em 03/08/2026. Reporting permanece uma fronteira de leitura separada, deriva somente fatos objetivos e não depende de tabelas, DTOs ou metadata de conteúdo privado.

### B8 — Integração do frontend

**Objetivo:** substituir persistência simulada pela API sem desmontar os módulos React.

Entregas:

- adapters HTTP por domínio;
- autenticação, seleção/contexto de tenant e tratamento de sessão;
- sincronização progressiva de catálogo, execução, tracker, ritual e gamificação;
- estados de loading, vazio, erro e reconexão;
- preservação mobile-first e das duas identidades visuais;
- testes E2E frontend–API nos fluxos críticos.

Problemas incorporados:

- encerrar `PP-002`, migrando tracker e ritual e removendo todo repository local de negócio como fonte de verdade;
- encerrar `PP-009`, versionando Playwright no CI para login, sessão, catálogo, execução, privacidade e viewports críticas;
- substituir `programs.mock.js` pelo catálogo empresarial real.

**Gate de saída:** os fluxos principais não dependem de `localStorage` nem mocks como fonte de verdade; `PP-002` e `PP-009` estão encerrados por adapters HTTP e E2E frontend reproduzível.

#### B8.1 — Catálogo empresarial no frontend

Substituir `programs.mock.js` pelo catálogo autenticado de `GET /api/programs`, respeitando o tenant selecionado e apresentando loading, vazio, erro e retry.

**Gate:** nenhum programa exibido é inventado pelo browser; adapter e regressão frontend aprovados.

**Estado:** concluído em 03/08/2026. O mock foi removido e o link usa o `slug` retornado pela API, preservando a rota modular do programa.

#### B8.2 — Tracker server-side

Modelar o estado pessoal do tracker, expor API tenant-scoped e substituir o repository local sem transportar justificativas privadas para reporting ou auditoria.

**Gate:** comportamentos, marcações e justificativas sobrevivem a nova sessão/dispositivo e nenhum dado de outro usuário ou tenant é enumerável.

- **B8.2.0 — Fundação persistente:** schema e migration para comportamentos, marcas objetivas e justificativas privadas. Gate: banco vazio e constraints compostas provam isolamento de tenant/membership.
- **B8.2.1 — Aplicação e HTTP:** casos de uso, repository Prisma, DTOs e rotas pessoais. Gate: contrato HTTP cobre lifecycle, limites, datas e não enumeração.
- **B8.2.2 — Adapter React:** trocar a fonte de verdade do tracker pelo adapter autenticado e preservar estados de UX. Gate: nova sessão ou dispositivo reconstrói o mês exclusivamente pela API; exportação é identificada como snapshot mensal.
- **B8.2.3 — Backup transacional:** substituir a importação local por contrato server-side validado e atômico, incluindo compatibilidade explícita com o formato legado que for aceito. Gate: falha de validação ou persistência não deixa estado parcial e o round-trip é provado por integração.

**Estado:** B8.2.0–B8.2.3 concluídas em 03/08/2026. A décima migration separa fatos objetivos de justificativas privadas e rejeita vínculos cruzados no PostgreSQL. O módulo `tracker` expõe leitura, mutações e backup pessoal v2; o frontend reconstrói cada mês pela API e converte backups locais v1 antes da restauração. Exportação e substituição são server-side, IDs internos não atravessam restaurações e falha de persistência foi provada com rollback integral. B8.3 é a próxima implementação.

#### B8.3 — Ritual server-side e projeções de missões

Persistir checklist e ciclos concluídos do ritual no servidor e fazer missões derivarem das fontes remotas de tracker, ritual e gamificação.

**Gate:** ritual e missões não leem `localStorage`; reexecução não duplica fatos nem recompensas.

- **B8.3.0 — Fundação persistente:** modelar dias, checks e estado do timer com escopo composto de tenant/membership. Gate: banco vazio e constraints rejeitam vínculo cruzado, duplicação e timer inconsistente.
- **B8.3.1 — Aplicação e HTTP:** expor leitura por período, checks idempotentes e comandos server-side de iniciar, pausar e reiniciar timer. Gate: timezone do tenant, data futura, concorrência e transições do relógio são provados por integração.
- **B8.3.2 — Adapter React:** substituir o repository local do ritual, preservando relógio e estados de UX. Gate: nova sessão/dispositivo reconstrói checklist e timer exclusivamente pela API.
- **B8.3.3 — Projeção de missões:** derivar métricas de tracker, ritual e gamificação no servidor e remover leituras locais da tela. Gate: métricas são tenant-scoped, reproduzíveis e não geram recompensa duplicada.

**Estado:** B8.3.0–B8.3.3 concluídas em 03/08/2026. A décima primeira migration persiste um dia por membership/data, checks por chaves editoriais estáveis e o estado consistente dos oito ciclos. O módulo `ritual` expõe leitura pessoal por período, checks idempotentes e comandos de iniciar, pausar e reiniciar; usa a data civil do timezone do tenant, serializa concorrência por membership e encerra no máximo um ciclo por início. As telas React de ritual e missões usam adapters HTTP; `GET /api/missions/me` deriva as oito métricas de tracker, ritual e gamificação sem produzir eventos ou recompensas. A integração PostgreSQL prova reexecução reproduzível, isolamento entre tenants e ausência de nova transação de XP. B8.4 é a próxima implementação.

#### B8.4 — E2E frontend–API

Versionar Playwright para sessão, catálogo, execução, tracker, ritual, privacidade e viewports críticas, integrando a suíte ao CI.

**Gate:** `PP-002` e `PP-009` atendem seus critérios objetivos de encerramento e nenhum repository local de negócio permanece como fonte de verdade.

- **B8.4.0 — Harness reproduzível:** configurar Playwright, coordenação dos servidores, projetos desktop/mobile, scripts e instalação do Chromium no CI. Gate: navegador real prova redirecionamento privado e renderiza o login nos dois viewports.
- **B8.4.1 — Sessão e catálogo:** criar fixture isolada e provar login, restauração da sessão, tenant selecionado, catálogo remoto e logout. Gate: nova página reconstrói contexto exclusivamente pela API e sessão revogada não reabre rota privada.
- **B8.4.2 — Execução e privacidade:** cobrir entrada no Projeto 66, fatos objetivos e ferramentas privadas. Gate: payload privado não aparece em respostas objetivas, auditoria ou gamificação observadas pela jornada.
- **B8.4.3 — Tracker, ritual e missões:** provar persistência entre contextos de navegador, projeção remota e viewports críticas; finalizar o gate no CI. Gate: nenhum fluxo usa mock ou `localStorage`, e `PP-002`/`PP-009` atendem os critérios de encerramento local.

**Estado:** B8.4.0–B8.4.3 concluídas em 03/08/2026. O Playwright coordena backend e Vite, executa Chromium real em projetos desktop e mobile, preserva traces/screenshots de falha e integra a instalação do navegador ao CI. Uma fixture idempotente e restrita a banco descartável materializa identidade, tenant e Projeto 66. As jornadas provam boundary anônimo, login, contexto organizacional, header tenant-scoped, catálogo remoto, entrada pelo slug canônico, restauração, logout, início do ciclo, placar objetivo, conclusão de atividade e resposta privada. Um marcador secreto aparece somente no endpoint privado e permanece ausente de enrollment, reporting, auditoria, gamificação e missões. Tracker e ritual são reconstruídos em outro contexto de navegador, missões refletem as projeções remotas e a instrumentação confirma ausência de acesso a `localStorage`; a matriz fecha com 7 execuções aprovadas e 1 skip funcional intencional entre desktop e mobile. `PP-002` e `PP-009` atendem seus critérios locais de encerramento. B9 é a próxima implementação.

### B9 — Administração da plataforma

**Objetivo:** completar as interfaces B2B e as operações do `SUPER_ADMIN`.

Entregas:

- gestão de membros, roles e times para CEO/Manager;
- dashboards de adesão e auditoria conforme escopo;
- tenants, primeiro CEO e programas habilitados para `SUPER_ADMIN`;
- trilhas de auditoria das operações administrativas;
- revisão mobile-first e desktop das áreas de gestão.

**Gate de saída:** cada papel executa apenas as operações previstas na matriz de autorização.

Para manter gates pequenos e não concentrar toda a administração em uma única entrega, a fase será executada em sete parcelas:

- **B9.1 — Fundação da área administrativa:** rota protegida por papel, adapters HTTP e visão tenant-scoped de membros/times. Gate: `USER` não acessa a área, `MANAGER` não consulta a rota exclusiva de times e cada leitura preserva `X-Tenant-Id`.
- **B9.2 — Lifecycle de times:** criar, renomear, arquivar e restaurar times pela interface do CEO. Gate: transições, conflitos e auditoria são refletidos sem estado otimista divergente.
- **B9.3 — Lifecycle de memberships:** alterar role/status e vínculos de time conforme CEO/Manager. Gate: a matriz negativa impede autoelevação e operações fora do escopo.
- **B9.4 — Convites administrativos:** listar, criar, reenviar e revogar convites no escopo permitido. Gate: tokens não aparecem no frontend e o estado de entrega é autoritativo.
- **B9.5 — Adesão e auditoria:** integrar reporting e auditoria pessoal, por time e tenant nas telas adequadas a cada papel. Gate: respostas privadas permanecem ausentes e Manager não enumera outros times.
- **B9.6 — Administração de plataforma:** interfaces separadas para tenants, primeiro CEO e programas habilitados, exclusivas de `SUPER_ADMIN`. Gate: contexto de plataforma não produz bypass empresarial.
- **B9.7 — Matriz E2E e responsividade:** cobrir operações administrativas positivas/negativas em desktop e mobile. Gate: cada papel executa apenas sua matriz e a B9 fecha sem depender de ocultação visual como autorização.

**Estado:** B9.1 concluída em 03/08/2026; B9.2–B9.4 concluídas em 04/08/2026; B9.5–B9.7 concluídas em 06/08/2026. A rota `/app/administracao` aparece apenas para CEO/Manager e redireciona `USER`; o adapter envia tenant selecionado em toda operação. CEO administra times, memberships, vínculos e convites e consulta adesão/auditoria do tenant ou de times ativos. Manager recebe somente pessoas, times gerenciados, convites de sua autoria e métricas dos times ativos que administra dentro do escopo server-side. Convites permitem múltiplos times, criação, reenvio com rotação e revogação, exibem o último resultado de entrega e nunca recebem o token da API. Reporting apresenta somente métricas objetivas e a interface de auditoria não renderiza metadados nem respostas privadas. A rota separada `/plataforma` aceita somente `SUPER_ADMIN` e permite listar/criar tenants, convidar o primeiro CEO, operar lifecycle e habilitar programas publicados; suas consultas não usam `X-Tenant-Id`, e o papel global não recebe acesso implícito às rotas empresariais. Cada mutação recarrega a projeção autoritativa. As matrizes PostgreSQL provam concorrência, conflitos, auditoria, bloqueio de execuções, isolamento, ownership, transições e provisionamento; quatro suítes com treze testes validam reporting/auditoria, e duas suítes com oito testes validam a administração de plataforma; Mailpit comprova o link utilizável pelo transporte SMTP local. A fixture Playwright separa `USER`, Manager, CEO e `SUPER_ADMIN`; oito cenários geram quinze execuções aprovadas e um skip intencional em Chromium desktop/mobile, incluindo mutações reais com e sem contexto tenant. O limite de login permanece estrito fora de `NODE_ENV=test`. A integração Resend, retry e bounce permanece no `PP-015` antes de staging. A B9 está concluída e B10 é a próxima fase.

### BX — Preparação pré-staging em laboratório

**Objetivo:** antecipar a implementação e a prova técnica de B10 sem depender das contas corporativas nem considerar staging oficial implantado.

**Escopo:** candidato imutável, deploy Vercel/Railway de laboratório, rewrite `/api`, roles de banco, seed fictício, PITR, dump diário para R2, observabilidade, jobs, e-mail de laboratório, testes externos e runbooks.

**Gate:** configuração reproduzível e validada apenas com dados fictícios; nenhum secret ou token de laboratório será reutilizado em staging/produção corporativos.

**Plano detalhado:** [`PLANO_BX_PRE_STAGING.md`](PLANO_BX_PRE_STAGING.md).

**Estado em 01/09/2026:** BX.1, BX.2 e BX.3 concluídas no recorte de laboratório; BX.4 em andamento. O PostgreSQL Railway recebeu somente seed fictício; o backup lógico diário foi enviado ao R2 com retenção de 90 dias, checksum válido e restore local aprovado em PostgreSQL 18 descartável, recuperando 33 tabelas e dados coerentes. Uma nova execução agendada em 01/09 criou `disciplina-pro-20260901T112923Z.dump`, verificou dump e manifesto no R2 e notificou o heartbeat Better Stack antes de registrar sucesso, encerrando a prova automática de monitoramento do backup no laboratório. Sentry frontend/backend e monitores Better Stack de backend, frontend e rewrite estão operacionais. O worker contínuo iniciou no Railway, manteve conexão com o PostgreSQL e processou evento com alteração observável de XP. A segurança/configuração foi aprovada por 44 suítes/142 testes unitários, 33 suítes/92 testes PostgreSQL e uma regressão focada posterior de 1 suíte/6 testes. A prova externa Vercel → Railway confirmou readiness, rewrite, CORS/CSRF, headers, Swagger fechado, sanitização de caminhos, rate limit com resposta `429`, login, persistência da sessão, cookies `__Host-` e logout. Permanecem na BX.4 a limpeza agendada de sessões, OpenTelemetry e runbook de incidente; Resend/e-mail aguardam domínio corporativo. O PITR/restore Railway permanece transferido explicitamente para PP-007/B10.3 antes do lançamento.

### B10 — Hardening, staging e release MVP

**Objetivo:** preparar operação segura e observável fora do ambiente local.

Entregas:

- ambiente de staging e migrations automatizadas com estratégia de rollback;
- gestão de secrets, TLS, headers, rate limits e políticas de cookie;
- logs, erros e monitoramento sem dados sensíveis;
- backup, restauração, retenção e procedimento de incidente;
- testes de carga básicos, acessibilidade e dispositivos físicos;
- checklist de release e documentação operacional.

Problemas incorporados:

- `PP-004`: implementar as políticas aprovadas, completar a matriz por operação e obter validação jurídica/contratual;
- `PP-005`: separar roles de migration e runtime e provar privilégio mínimo;
- `PP-006`: operar chaves e peppers em secret manager e ensaiar rotação/comprometimento;
- `PP-007`: implementar RPO/RTO aprovados e ensaiar backup, restauração e rollback;
- `PP-008`: implantar alertas, agregação de erros e runbook de incidente sem dados sensíveis;
- `PP-010`: validar teclado, leitor de tela e dispositivos físicos;
- `PP-014`: restaurar CodeQL/Dependabot ou automação equivalente validada;
- `PP-015`: selecionar e validar provedor transacional, retry e bounce;
- `PP-016`: zerar a auditoria no nível configurado sem downgrade ou override incompatível;
- ampliar o Playwright iniciado no `PP-009` para os fluxos críticos em staging.

**Gate de saída:** deploy reproduzível, restauração ensaiada e fluxos críticos aprovados em staging; nenhum `PP-*` P0/P1 permanece aberto e `PP-014`/`PP-015` também atendem seus critérios de encerramento.

#### B10.0 — Contrato operacional e decisões externas

**Objetivo:** fechar provedores, responsabilidades, ambientes, critérios de aceite e sequência de deploy antes de alterar infraestrutura.

**Checklist e gate:** a conclusão de B10.0 é controlada pelo [checklist operacional B10.0](CHECKLIST_DEFINICOES_PENDENTES.md#0-gate-operacional-da-b100). Nenhuma etapa seguinte pode depender de item ainda aberto nesse checklist.

**Decisões parciais aprovadas em 03/08/2026:** Railway para hospedagem e PostgreSQL em `us-east`; Cloudflare R2 para cópia externa de backups; Railway Environment Variables para segredos no MVP; OpenTelemetry para instrumentação; Sentry para exceções, stack traces e performance; BetterStack para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais; Resend para e-mail; RPO de 1 hora, RTO de 4 horas, retenção de backup de 90 dias; dois ambientes, com staging antes de produção. Região, retenção e contratos ainda dependem de validação jurídica. Domínio, responsáveis, orçamento e critérios de abertura permanecem pendentes. Fonte: [ADR 016](adr/016-EscolhasDev.md).

#### B10.1 — Infraestrutura, banco e secrets

**Objetivo:** criar ambientes reproduzíveis com privilégio mínimo e material criptográfico gerenciado.

**Problemas proprietários:** `PP-005` e `PP-006`.

**Gate:** runtime e migrations usam roles distintas; TLS, cookies e headers estão configurados; chaves e peppers ficam no secret manager; rotação e comprometimento são ensaiados.

#### B10.2 — Governança e ciclo de vida dos dados

**Objetivo:** transformar as políticas aprovadas pela Spark em contratos validados e rotinas técnicas verificáveis, sem transferir decisões jurídicas ao Desenvolvedor.

**Problema proprietário:** `PP-004`.

**Responsabilidades:** Spark define/aprova políticas e opera o canal; Jurídico valida bases, papéis por operação, contratos e conformidade; Desenvolvedor implementa e testa jobs e mecanismos.

**Gate:** cada operação/categoria possui finalidade/base, papel contratual, prazo, destino ao vencer e responsável validados; documentos jurídicos refletem a decisão; confirmação, acesso, correção, exportação, anonimização ou exclusão e jobs automatizados estão testados.

#### B10.3 — Resiliência, observabilidade e serviços externos

**Objetivo:** tornar falhas detectáveis e recuperáveis e substituir dependências exclusivamente locais.

**Problemas proprietários:** `PP-007`, `PP-008` e `PP-015`.

**Gate:** RPO/RTO definidos, backup e restauração ensaiados, rollback/forward-fix documentado, alertas testados e provedor de e-mail validado com retry e bounce.

#### B10.4 — Verificação de segurança, qualidade e acessibilidade

**Objetivo:** executar gates independentes sobre o candidato a release.

**Problemas proprietários:** `PP-010`, `PP-014` e `PP-016`; ampliação do `PP-009`.

**Gate:** auditoria de dependências aprovada, automação de segurança equivalente validada, Playwright executado em staging e fluxos críticos aprovados com tecnologia assistiva e dispositivos físicos.

#### B10.5 — Staging, ensaio de release e decisão de lançamento

**Objetivo:** provar o procedimento completo sobre um candidato imutável antes do primeiro release controlado.

**Entregas:** deploy, migrations, materialização editorial, smoke tests, restauração, rollback/forward-fix, checklist de incidente e decisão formal de go/no-go.

**Gate de saída:** todos os gates B10.0–B10.4 estão aprovados, nenhum P0/P1 permanece aberto e o ensaio completo de staging é reproduzível.

## 4. Matriz obrigatória de resolução dos problemas

Esta matriz vincula dívida a uma entrega e impede que o item fique apenas no relatório narrativo:

| Problema | Fase responsável | Evidência exigida no gate |
|---|---|---|
| PP-002 — persistência local | B6.5 e B8 | gamificação, tracker e ritual server-side; nenhum repository local de negócio como fonte de verdade |
| PP-004 — retenção/base legal | B10.2 | matriz/contratos validados; fluxos e jobs testados; aprovação da Spark e validação jurídica |
| PP-005 — papéis de banco | B10.1 | credenciais separadas e teste de privilégio mínimo |
| PP-006 — secrets e rotação | B10.1 | secret manager e ensaio de rotação/comprometimento |
| PP-007 — backup/rollback | B10.3 | RPO/RTO, restauração e estratégia de migration ensaiados |
| PP-008 — observabilidade | B10.3 | alertas e runbook testados sem exposição sensível |
| PP-009 — Playwright frontend | B8, ampliado em B10.4 | suíte versionada no CI e execução em staging |
| PP-010 — acessibilidade real | B10.4 | validação assistiva e dispositivos físicos |
| PP-014 — automação de segurança | B10.4 | CodeQL/Dependabot ou equivalente validado |
| PP-015 — e-mail transacional | B10.3 | envio, retry e bounce pelo provedor escolhido |
| PP-016 — advisories | B10.4 | `npm audit` no nível configurado sem achados |
| PP-017 — CORS/PUT | B6.1 — encerrado em 26/07/2026 | teste de preflight real e allowlist reconciliada |

Nenhuma fase pode declarar atendido um desses gates somente por atualização documental. O critério de encerramento canônico permanece em [`PROBLEMAS_POSTERGADOS.md`](PROBLEMAS_POSTERGADOS.md).

## 5. Prioridade de produção

1. **Corretude de domínio e isolamento:** B0.5, identidade e multi-tenancy precedem features de negócio.
2. **Caminho vertical utilizável:** convites → programas → execução antes de dashboards avançados.
3. **Privacidade e auditoria:** entram junto das operações que observam, não como correção tardia.
4. **Integração progressiva:** cada repository local só é substituído quando seu contrato backend estiver estável.
5. **Operação:** staging e hardening precedem qualquer uso real por empresas.

## 6. Fora do MVP

- customização de programas por tenant;
- billing e cobrança;
- IA;
- microserviços e filas externas;
- editor de regras de gamificação;
- notificações avançadas;
- relatórios analíticos avançados;
- aplicativo móvel nativo.

Esses itens só entram em um roadmap posterior após validação do MVP e não devem alterar os gates atuais.
