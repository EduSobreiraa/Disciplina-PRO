# Checklist de prontidão para o backend

> Disciplina PRO · Atualizado em 14/07/2026
> Objetivo: preparar ambiente, segurança e decisões antes da B0.

## 1. Ambiente local

- [x] Docker instalado (`29.6.0`).
- [x] Git instalado (`2.55.0`).
- [x] GitHub CLI instalado (`2.94.0`).
- [x] Cliente PostgreSQL instalado (`psql 18.3`).
- [x] OpenSSL 3 disponível.
- [ ] Trocar Node.js 26 Current por Node.js 24 LTS.
- [ ] Criar `.nvmrc` ou `.node-version` com a versão adotada.
- [ ] Declarar `engines.node` nos packages.
- [ ] Confirmar `docker compose version` e execução de um container PostgreSQL com health check.
- [ ] Confirmar conexão do `psql` ao PostgreSQL do Docker.

## 2. GitHub CLI e MCP

- [ ] Refazer autenticação local: `gh auth login -h github.com`.
- [ ] Confirmar `gh auth status` sem token inválido.
- [ ] Garantir acesso do GitHub MCP ao repositório `EduSobreiraa/Disciplina-PRO`.
- [ ] Repetir leitura de commits pelo MCP após ajustar o acesso.
- [ ] Restringir o token do MCP somente ao repositório do projeto.
- [ ] Conceder `Metadata: read`.
- [ ] Conceder `Contents: read/write` para branches e arquivos.
- [ ] Conceder `Issues: read/write`.
- [ ] Conceder `Pull requests: read/write`.
- [ ] Conceder `Commit statuses: read` e `Actions: read`, se o servidor MCP suportar.
- [ ] Manter `Administration`, exclusão de repositório e gestão de secrets sem escrita automática.
- [ ] Avaliar um GitHub MCP complementar para Actions, branch protection e security alerts.

Estado verificado: o MCP atual expõe leitura/escrita de arquivos, branches, issues, PRs, reviews e merge, mas retornou `Not Found` ao consultar o repositório. Não há ferramentas expostas para listar execuções do Actions, configurar branch protection ou consultar Dependabot/CodeQL/secret scanning.

## 3. Segurança do repositório

- [ ] Ativar Dependabot para npm, GitHub Actions e Docker.
- [ ] Ativar CodeQL para JavaScript/TypeScript.
- [ ] Ativar secret scanning e push protection, conforme disponibilidade.
- [ ] Criar `.github/workflows/ci.yml` durante B0.
- [ ] Configurar checks obrigatórios antes de proteger `main`.
- [ ] Impedir force push em `main`.
- [ ] Adotar feature branches e pull requests durante o backend.
- [ ] Criar `.env.example` sem valores secretos.
- [ ] Confirmar que `.env`, dumps, certificados e tokens estão no `.gitignore`.

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

## 5. Decisões arquiteturais antes do schema

- [ ] Fechar o formato e a política de `ProgramVersion`.
- [ ] Fechar `EnrollmentPause` e cálculo reproduzível dos dias pausados.
- [ ] Fechar estados e transições de `TenantMembership`.
- [ ] Fechar a representação de `SUPER_ADMIN` fora de `TenantRole`.
- [ ] Definir política de soft delete, encerramento e retenção por entidade.
- [ ] Definir convenção de IDs, timestamps e timezone.
- [ ] Definir política de conteúdo privado e exclusão pelo titular.
- [ ] Definir estratégia de access token e refresh token rotativo.
- [ ] Definir transporte do refresh token e política CORS/CSRF.

## 6. Fundação técnica planejada — B0

- [ ] Criar `backend/` com NestJS + TypeScript.
- [ ] Criar package raiz com workspaces para `frontend` e `backend`.
- [ ] Instalar e fixar versões das dependências.
- [ ] Criar configuração tipada por ambiente.
- [ ] Criar `compose.yaml` com PostgreSQL e health check.
- [ ] Adicionar Prisma, `@prisma/adapter-pg` e `pg`.
- [ ] Criar `PrismaModule`/adapter sem expor Prisma aos controllers.
- [ ] Configurar `ValidationPipe` global.
- [ ] Configurar filtro padronizado de exceções.
- [ ] Configurar Helmet, CORS, limites de payload e throttling inicial.
- [ ] Configurar logging estruturado e request ID.
- [ ] Criar endpoint de health check.
- [ ] Gerar OpenAPI com Swagger.
- [ ] Configurar testes unitários e integração com PostgreSQL real.
- [ ] Criar comandos de lint, typecheck, test, build e migration check.

## 7. Dependências previstas

- [ ] NestJS: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`.
- [ ] DTOs: `class-validator`, `class-transformer`.
- [ ] Banco: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`.
- [ ] Segurança: `helmet`, `@nestjs/throttler`.
- [ ] Autenticação futura: `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `argon2`.
- [ ] Logging: `nestjs-pino`, `pino`, `pino-pretty` apenas no desenvolvimento.
- [ ] Contratos: `@nestjs/swagger`.
- [ ] Testes: Jest, Supertest e Testcontainers ou estratégia equivalente com PostgreSQL real.

## 8. Serviços externos — não bloquear B0

- [ ] Adicionar Mailpit em desenvolvimento quando B5 (convites) começar.
- [ ] Escolher provedor transacional de e-mail somente antes de staging.
- [ ] Escolher hospedagem após autenticação, migrations e health check estarem estáveis.
- [ ] Configurar Sentry/observabilidade antes do primeiro staging público.
- [ ] Definir backup, restauração e retenção antes de produção.

Não adicionar agora: Redis, RabbitMQ, Kafka, Kubernetes, Elasticsearch, microserviços, billing ou IA.

## 9. Critério para iniciar B0

O desenvolvimento pode começar quando os seguintes itens estiverem concluídos:

- Node 24 LTS padronizado;
- Docker Compose e PostgreSQL local validados;
- `psql` conectado ao container;
- GitHub CLI autenticado;
- GitHub MCP com leitura confirmada do repositório;
- segredos protegidos e `.env.example` planejado;
- quatro decisões pendentes do schema encaminhadas ou explicitamente adiadas com justificativa.
