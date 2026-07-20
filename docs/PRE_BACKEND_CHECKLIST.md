# Checklist de prontidão para o backend

> Disciplina PRO · Atualizado em 20/07/2026
> Objetivo: acompanhar a prontidão do ambiente e as pendências da fundação B0.

## 1. Ambiente local

- [x] Docker instalado (`29.6.0`).
- [x] Git instalado (`2.55.0`).
- [x] GitHub CLI instalado (`2.94.0`).
- [x] Cliente PostgreSQL instalado (`psql 18.3`).
- [x] OpenSSL 3 disponível.
- [x] Trocar Node.js 26 Current por Node.js 24 LTS (`24.18.0`).
- [x] Criar `.nvmrc` e `.node-version` com a versão adotada.
- [x] Declarar `engines.node` nos packages.
- [x] Confirmar `docker compose version` e execução de um container PostgreSQL com health check.
- [x] Confirmar conexão autenticada do PostgreSQL e consulta SQL pelo container.

## 2. GitHub CLI e MCP

- [ ] Refazer autenticação local: `gh auth login -h github.com`.
- [x] Confirmar GitHub CLI operacional; usado para acompanhar o CI remoto da B1.
- [x] Garantir acesso do GitHub MCP ao repositório `EduSobreiraa/Disciplina-PRO`.
- [x] Repetir leitura de commits pelo MCP após ajustar o acesso.
- [ ] Restringir o token do MCP somente ao repositório do projeto.
- [ ] Conceder `Metadata: read`.
- [ ] Conceder `Contents: read/write` para branches e arquivos.
- [ ] Conceder `Issues: read/write`.
- [ ] Conceder `Pull requests: read/write`.
- [ ] Conceder `Commit statuses: read` e `Actions: read`, se o servidor MCP suportar.
- [ ] Manter `Administration`, exclusão de repositório e gestão de secrets sem escrita automática.
- [ ] Avaliar um GitHub MCP complementar para Actions, branch protection e security alerts.

Estado verificado: o MCP atual lê o repositório privado e expõe arquivos, branches, issues, PRs, reviews e merge. O `gh` local está autenticado e acompanha execuções do Actions; branch protection e recursos de segurança dependem das capacidades do plano/repositório.

## 3. Segurança do repositório

- [ ] Reavaliar Dependabot quando o plano/repositório oferecer o fluxo desejado; por enquanto usar `npm audit` local e no CI.
- [ ] Reavaliar CodeQL quando disponível no plano atual.
- [ ] Ativar secret scanning e push protection, conforme disponibilidade.
- [x] Criar `.github/workflows/ci.yml` antes de adotar checks obrigatórios.
- [x] Integrar SonarQube Cloud ao CI e gerar cobertura LCOV de frontend/backend.
- [ ] Configurar checks obrigatórios antes de proteger `main`.
- [ ] Impedir force push em `main`.
- [ ] Adotar feature branches e pull requests durante o backend.
- [x] Criar `.env.example` sem valores secretos.
- [x] Confirmar que `.env`, dumps, certificados e tokens estão no `.gitignore`.

## 4. MCPs recomendados

- [ ] Adicionar PostgreSQL MCP conectado somente ao banco local/de desenvolvimento.
- [ ] Utilizar usuário read-only no PostgreSQL MCP para auditorias.
- [ ] Manter credenciais do MCP fora do repositório e das conversas.
- [ ] Adicionar MCP de documentação versionada para NestJS, Prisma e bibliotecas relacionadas.
- [ ] Manter Playwright MCP para testes frontend–API.
- [x] Filesystem MCP disponível.
- [x] Sequential Thinking MCP disponível.
- [x] Playwright MCP disponível e funcional.
- [ ] Adicionar Sentry MCP apenas quando existir ambiente de staging.

## 5. B0.5 — Decisões arquiteturais antes do schema

- [x] Fechar o formato e a política de `ProgramVersion` — ADR 006.
- [x] Fechar `EnrollmentPause` e cálculo reproduzível dos dias pausados — ADR 007.
- [x] Fechar estados e transições de `TenantMembership` — ADR 004.
- [x] Fechar a representação de `SUPER_ADMIN` fora de `TenantRole` — ADR 005.
- [x] Definir convenção de IDs e sua exposição pública — ADR 001.
- [x] Definir armazenamento temporal, timezone do tenant e cálculo de `programDay` — ADR 002.
- [x] Definir política de soft delete, unicidade, restauração e retenção por entidade — ADR 003.
- [x] Definir claims, duração, issuer, audience e chaves do JWT — ADR 008.
- [x] Definir rotação, revogação, reuse detection e persistência do refresh token — ADR 009.
- [x] Definir transporte da sessão e política CORS/CSRF — ADR 010.

Gate aprovado: as dez decisões foram fechadas nos ADRs 001–010. O primeiro `schema.prisma`, a primeira migration e o início de `identity-access` estão liberados para a B1. Política de conteúdo privado e exclusão permanece uma decisão transversal obrigatória antes do módulo `execution`.

## 6. Fundação técnica planejada — B0

- [x] Criar `backend/` com NestJS + TypeScript.
- [x] Criar package raiz com workspaces para `frontend` e `backend`.
- [x] Instalar dependências e gerar lockfile único na raiz.
- [x] Criar configuração tipada e validada por ambiente.
- [x] Criar `compose.yaml` com PostgreSQL e health check.
- [x] Adicionar `@prisma/client`, `@prisma/adapter-pg` e `pg`.
- [x] Instalar e fixar Prisma CLI 7.9.0 na B1; atualização encerrou o alerta transitivo moderado da versão anterior.
- [x] Criar `PrismaModule` com adapter `pg`, conexão única e shutdown limpo.
- [x] Configurar `ValidationPipe` global.
- [x] Configurar filtro e contrato padronizado de exceções.
- [x] Configurar Helmet, CORS, throttling e limite explícito de payload.
- [x] Configurar logging estruturado, redação de headers sensíveis e request ID.
- [x] Criar endpoint de health check inicial da API.
- [x] Gerar OpenAPI com Swagger.
- [x] Configurar Jest, teste unitário e teste HTTP E2E do health check.
- [x] Configurar testes de integração com PostgreSQL real.
- [x] Criar comandos de lint, typecheck, test e build; migration check depende do Prisma schema.

## 7. Dependências previstas

- [x] NestJS: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`.
- [x] DTOs: `class-validator`, `class-transformer`.
- [x] Banco: `prisma`, `@prisma/client` e `@prisma/adapter-pg` alinhados em 7.9.0, além de `pg`.
- [x] Segurança: `helmet`, `@nestjs/throttler`.
- [x] Segurança de identidade: `argon2` 0.44.0 e `jose` 6.2.3, ambos fixados e auditados.
- [x] Logging: `nestjs-pino`, `pino`, `pino-pretty` apenas no desenvolvimento.
- [x] Contratos: `@nestjs/swagger`.
- [x] Testes: Jest, Supertest e estratégia de integração com PostgreSQL real.

## 8. B1 — Ordem de implementação

- [x] B1.1 — Primeiro `schema.prisma` validado contra os ADRs 001–010.
- [x] B1.2 — Migration baseline revisada em banco vazio e `PrismaModule` implementado.
- [x] B1.3 — Identidade, Argon2id e bootstrap transacional de plataforma implementados.
- [x] B1.4 — JWT RS256, sessões, refresh rotativo, revogação e reuse detection implementados.
- [x] B1.5 — Login, refresh e logout expostos com CORS estrito, cookies e CSRF ligado à sessão.
- [x] B1.6 — `AuthenticationGuard`, `CurrentPrincipal`, rotas públicas explícitas e boundary de plataforma implementados.
- [ ] B1.7 — Executar hardening, testes completos e gate de encerramento.

Cada sub-bloco deve fechar seu próprio gate antes do seguinte. A autorização por role e escopo, `TenantContextGuard` completo e operações organizacionais permanecem na B2.

## 9. Serviços externos — não bloquear B0

- [ ] Adicionar Mailpit em desenvolvimento quando B3 (convites) começar.
- [ ] Escolher provedor transacional de e-mail somente antes de staging.
- [ ] Escolher hospedagem após autenticação, migrations e health check estarem estáveis.
- [ ] Configurar Sentry/observabilidade antes do primeiro staging público.
- [ ] Definir backup, restauração e retenção antes de produção.

Não adicionar agora: Redis, RabbitMQ, Kafka, Kubernetes, Elasticsearch, microserviços, billing ou IA.

## 10. Situação de prontidão

**Resultado:** ambiente, B0, B0.5 e B1.1–B1.4 concluídos. Node, npm, Docker, Compose, PostgreSQL, Prisma, Argon2, `jose`, Git, lockfile único e acesso ao repositório estão operacionais.

Decisões da **B0.5 concluídas e liberadas para o primeiro schema de domínio**:

- `ProgramVersion` e política de publicação;
- pausas de enrollment e cálculo dos dias;
- estados/transições de membership;
- representação de `SUPER_ADMIN`;
- IDs, timezone, soft delete, JWT, refresh token e CORS/CSRF.

Persistência, identidade, sessões, transporte HTTP e autenticação atual estão implementados até B1.6. A próxima etapa é B1.7: hardening e gate de encerramento.
