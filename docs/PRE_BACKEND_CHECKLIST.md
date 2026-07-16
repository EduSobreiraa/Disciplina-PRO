# Checklist de prontidão para o backend

> Disciplina PRO · Atualizado em 14/07/2026
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
- [ ] Confirmar `gh auth status` sem token inválido.
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

Estado verificado: o MCP atual lê o repositório privado e expõe arquivos, branches, issues, PRs, reviews e merge. Não há ferramentas expostas para listar execuções do Actions, configurar branch protection ou consultar Dependabot/CodeQL/secret scanning. O `gh` local ainda requer nova autenticação.

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

- [ ] Fechar o formato e a política de `ProgramVersion`.
- [ ] Fechar `EnrollmentPause` e cálculo reproduzível dos dias pausados.
- [ ] Fechar estados e transições de `TenantMembership`.
- [ ] Fechar a representação de `SUPER_ADMIN` fora de `TenantRole`.
- [ ] Definir convenção de IDs e sua exposição pública.
- [ ] Definir armazenamento temporal, timezone do tenant e cálculo de `programDay`.
- [ ] Definir política de soft delete, unicidade, restauração e retenção por entidade.
- [ ] Definir claims, duração, issuer, audience e chaves do JWT.
- [ ] Definir rotação, revogação, reuse detection e persistência do refresh token.
- [ ] Definir transporte da sessão e política CORS/CSRF.

Gate: somente após estes dez itens serão escritos o primeiro `schema.prisma` e a primeira migration; então começa `identity-access`. Política de conteúdo privado e exclusão permanece uma decisão transversal obrigatória antes do módulo `execution`.

## 6. Fundação técnica planejada — B0

- [x] Criar `backend/` com NestJS + TypeScript.
- [x] Criar package raiz com workspaces para `frontend` e `backend`.
- [x] Instalar dependências e gerar lockfile único na raiz.
- [x] Criar configuração tipada e validada por ambiente.
- [x] Criar `compose.yaml` com PostgreSQL e health check.
- [x] Adicionar `@prisma/client`, `@prisma/adapter-pg` e `pg`.
- [ ] Instalar o Prisma CLI na B1, após a B0.5; removido da B0 enquanto sua dependência transitiva possuía alerta sem correção compatível.
- [ ] Criar `PrismaModule`/adapter na B1, após schema e migration liberados pela B0.5.
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
- [x] Banco: `@prisma/client`, `@prisma/adapter-pg`, `pg`; CLI `prisma` adiado para a B1.
- [x] Segurança: `helmet`, `@nestjs/throttler`.
- [ ] Autenticação futura: `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `argon2`.
- [x] Logging: `nestjs-pino`, `pino`, `pino-pretty` apenas no desenvolvimento.
- [x] Contratos: `@nestjs/swagger`.
- [x] Testes: Jest, Supertest e estratégia de integração com PostgreSQL real.

## 8. Serviços externos — não bloquear B0

- [ ] Adicionar Mailpit em desenvolvimento quando B5 (convites) começar.
- [ ] Escolher provedor transacional de e-mail somente antes de staging.
- [ ] Escolher hospedagem após autenticação, migrations e health check estarem estáveis.
- [ ] Configurar Sentry/observabilidade antes do primeiro staging público.
- [ ] Definir backup, restauração e retenção antes de produção.

Não adicionar agora: Redis, RabbitMQ, Kafka, Kubernetes, Elasticsearch, microserviços, billing ou IA.

## 9. Situação de prontidão

**Resultado:** ambiente aprovado e B0 concluída em 15/07/2026. Node, npm, Docker, Compose, PostgreSQL, Git, lockfile único e acesso ao repositório estão operacionais. O `gh` CLI sem autenticação válida não bloqueia o desenvolvimento porque Git e GitHub MCP já atendem ao fluxo atual.

Pendências da **B0.5 que bloqueiam o primeiro schema de domínio**, mas não a conclusão técnica da B0:

- `ProgramVersion` e política de publicação;
- pausas de enrollment e cálculo dos dias;
- estados/transições de membership;
- representação de `SUPER_ADMIN`;
- IDs, timezone, soft delete, JWT, refresh token e CORS/CSRF.

O `PrismaModule`, o primeiro `schema.prisma` e a primeira migration pertencem à transição B0.5 → B1. A próxima etapa é exclusivamente a aprovação das dez decisões da B0.5.
