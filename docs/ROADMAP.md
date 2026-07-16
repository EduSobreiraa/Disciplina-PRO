# Roadmap do Disciplina PRO

> Spark Inteligência Corporativa · Atualizado em 14/07/2026
> Escopo: conclusão do MVP B2B SaaS multi-tenant, do estado atual até o primeiro release controlado.

## 1. Estado de partida

- frontend individual F0–F9 concluído e validado em React;
- fundação B0 do backend NestJS iniciada;
- PostgreSQL local e ferramentas essenciais operacionais;
- schema Prisma de domínio ainda não criado;
- áreas empresariais, autenticação real e integração frontend–API ainda pendentes.

O roadmap é sequencial por dependência, não uma promessa de datas. Uma fase só é encerrada quando seus critérios de saída estiverem atendidos, testados e documentados.

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
B10 Hardening, staging e release MVP
```

## 3. Fases restantes

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

Progresso: **5/10 decisões aprovadas**. IDs, timezone, lifecycle/exclusão, `TenantMembership` e `SUPER_ADMIN` foram fechados nos ADRs 001–005.

Entregáveis:

- decisões registradas em `ARQUITETURA.md` ou ADRs vinculados;
- invariantes e transições documentadas;
- ameaças e escolhas de autenticação explicitadas;
- checklist B0.5 integralmente aprovado.

**Gate de saída:** nenhuma das dez decisões permanece ambígua. Em seguida, escreve-se o primeiro `schema.prisma`, gera-se a primeira migration e inicia-se `identity-access`.

### B1 — Persistência e Identity Access

**Objetivo:** estabelecer dados persistentes, identidade e sessões seguras.

Entregas:

- primeiro `schema.prisma` e migration versionada;
- Prisma CLI instalado na versão estável auditada;
- `PrismaModule` com adapter `pg` e ciclo de vida controlado;
- modelos iniciais de usuário, acesso de plataforma, membership e sessão;
- login, refresh rotativo e logout;
- hashing de senha e tokens opacos quando aplicável;
- guards de autenticação e contexto inicial;
- testes de integração e E2E dos fluxos de sessão.

**Gate de saída:** sessão pode ser criada, renovada e revogada sem expor segredos; migrations funcionam em banco vazio.

### B2 — Organizações e isolamento multi-tenant

**Objetivo:** implementar tenants, memberships, times e autorização por role mais escopo.

Entregas:

- lifecycle de tenant e membership;
- times e `TeamMembership`;
- `TenantContextGuard` e `PermissionGuard`;
- casos de uso de CEO e Manager respeitando escopo;
- repositories obrigatoriamente filtrados por `tenantId`;
- testes negativos de acesso cruzado entre tenants e times.

**Gate de saída:** nenhuma operação empresarial acessa outro tenant; permissões cumulativas e escopo estão cobertos por testes.

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

### B4 — Catálogo e habilitação de programas

**Objetivo:** administrar programas globais e sua disponibilidade por tenant.

Entregas:

- `Program`, versões, fases, atividades e `TenantProgram`;
- publicação imutável conforme B0.5;
- habilitação por `SUPER_ADMIN`;
- enrollment `AVAILABLE` automático para membros ativos e novos convidados;
- contratos de leitura para catálogo e detalhes.

**Gate de saída:** habilitar um programa cria disponibilidade idempotente sem acoplar o Projeto 66 ao núcleo.

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

### B6 — Eventos, gamificação e auditoria

**Objetivo:** separar a operação principal de suas consequências internas.

Entregas:

- eventos internos do monolito com handlers idempotentes;
- `XpTransaction` append-only e `UserAchievement`;
- regras iniciais de XP e conquistas em código;
- `AuditEvent` imutável sem conteúdo privado;
- tratamento consistente de falhas e reprocessamento dentro do monolito.

**Gate de saída:** repetir um evento não duplica XP, conquistas ou auditoria.

### B7 — Reporting e privacidade

**Objetivo:** oferecer métricas de adesão sem revelar conteúdo íntimo.

Entregas:

- relatórios pessoal, por time e por tenant;
- membros inativos, progresso, registros e agregações;
- escopo nominal para Managers e global para CEO;
- contratos de resposta com allowlist de dados objetivos;
- testes de não exposição de respostas privadas e metadata.

**Gate de saída:** relatórios são derivados de fatos e os testes provam que conteúdo privado não atravessa a fronteira de gestão.

### B8 — Integração do frontend

**Objetivo:** substituir persistência simulada pela API sem desmontar os módulos React.

Entregas:

- adapters HTTP por domínio;
- autenticação, seleção/contexto de tenant e tratamento de sessão;
- sincronização progressiva de catálogo, execução, tracker, ritual e gamificação;
- estados de loading, vazio, erro e reconexão;
- preservação mobile-first e das duas identidades visuais;
- testes E2E frontend–API nos fluxos críticos.

**Gate de saída:** os fluxos principais não dependem de `localStorage` como fonte de verdade.

### B9 — Administração da plataforma

**Objetivo:** completar as interfaces B2B e as operações do `SUPER_ADMIN`.

Entregas:

- gestão de membros, roles e times para CEO/Manager;
- dashboards de adesão e auditoria conforme escopo;
- tenants, primeiro CEO e programas habilitados para `SUPER_ADMIN`;
- trilhas de auditoria das operações administrativas;
- revisão mobile-first e desktop das áreas de gestão.

**Gate de saída:** cada papel executa apenas as operações previstas na matriz de autorização.

### B10 — Hardening, staging e release MVP

**Objetivo:** preparar operação segura e observável fora do ambiente local.

Entregas:

- ambiente de staging e migrations automatizadas com estratégia de rollback;
- gestão de secrets, TLS, headers, rate limits e políticas de cookie;
- logs, erros e monitoramento sem dados sensíveis;
- backup, restauração, retenção e procedimento de incidente;
- testes de carga básicos, acessibilidade e dispositivos físicos;
- checklist de release e documentação operacional.

**Gate de saída:** deploy reproduzível, restauração ensaiada e fluxos críticos aprovados em staging.

## 4. Prioridade de produção

1. **Corretude de domínio e isolamento:** B0.5, identidade e multi-tenancy precedem features de negócio.
2. **Caminho vertical utilizável:** convites → programas → execução antes de dashboards avançados.
3. **Privacidade e auditoria:** entram junto das operações que observam, não como correção tardia.
4. **Integração progressiva:** cada repository local só é substituído quando seu contrato backend estiver estável.
5. **Operação:** staging e hardening precedem qualquer uso real por empresas.

## 5. Fora do MVP

- customização de programas por tenant;
- billing e cobrança;
- IA;
- microserviços e filas externas;
- editor de regras de gamificação;
- notificações avançadas;
- relatórios analíticos avançados;
- aplicativo móvel nativo.

Esses itens só entram em um roadmap posterior após validação do MVP e não devem alterar os gates atuais.
