# Disciplina PRO

Plataforma B2B SaaS multi-tenant da **Spark Inteligência Corporativa** para acompanhamento comportamental e execução de programas de desenvolvimento.

O **Projeto 66** é o primeiro programa disponível dentro da plataforma. Ele possui domínio e identidade visual próprios, sem estar acoplado ao núcleo do Disciplina PRO.

## Estado do projeto

O frontend concluiu a migração funcional F0–F9 dos protótipos para React. Os HTMLs originais permanecem apenas como referência histórica visual e funcional.

Já estão disponíveis:

- shell mobile-first do Disciplina PRO;
- catálogo empresarial integrado à API;
- tracker mensal de comportamentos em “Minha evolução”;
- ritual diário com abertura, execução, fechamento, revisão semanal e timer 30/30;
- gamificação com ledger de XP, níveis, conquistas e histórico de transações;
- grade verde/vermelha e justificativas;
- Projeto 66 com ciclo, registro diário, checklist e tracker;
- meditação, respiração, Novo Eu, modo crise e dia difícil;
- sessão real com access token somente em memória e refresh por cookie;
- ciclo e ferramentas privadas do Projeto 66 integrados à API;
- tracker, ritual, gamificação e missões com fontes de verdade ou projeções server-side;
- administração empresarial para CEO/Manager e administração global isolada para `SUPER_ADMIN`.

O backend NestJS concluiu B0, as decisões B0.5 e B1–B9. Identity Access, organizações, convites, catálogo, execução, eventos internos, gamificação, auditoria, reporting objetivo e administração possuem implementação e testes locais. A integração frontend–API está versionada e reproduzível.

No laboratório BX, Vercel, Railway/PostgreSQL, Cloudflare R2, Sentry e Better Stack estão operacionais. Em 01/09/2026, uma execução agendada comprovou novamente o dump diário, upload e verificação dos objetos no R2 e heartbeat automático. O worker contínuo de eventos também está ativo no Railway e teve conexão com PostgreSQL e processamento de XP comprovados. A etapa atual é a BX.4, com limpeza agendada de sessões, OpenTelemetry e runbook de incidente ainda pendentes; e-mail real permanece bloqueado até existir domínio/e-mail corporativo. Esse estado não constitui staging ou produção e não autoriza dados reais; bloqueios vigentes estão em [Problemas postergados](docs/PROBLEMAS_POSTERGADOS.md).

## Arquitetura atual

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL |
| Arquitetura | Monolito modular em camadas |
| Multi-tenancy | Banco compartilhado com isolamento por `tenantId` |

Documentos principais:

- [Arquitetura do produto](ARQUITETURA.md)
- [Governança e responsabilidades](GOVERNANCA.md)
- [Inventário e plano de migração do frontend](docs/MIGRACAO_FRONTEND.md)
- [Auditoria do frontend](docs/AUDITORIA_FRONTEND.md)
- [Problemas postergados](docs/PROBLEMAS_POSTERGADOS.md)
- [Relatório técnico de progresso](docs/RELATORIO_PROGRESSO.md)
- [Relatório executivo de decisões para o CEO](docs/RELATORIO_EXECUTIVO_CEO.md)
- [Checklist direto de definições pendentes](docs/CHECKLIST_DEFINICOES_PENDENTES.md)
- [Checklist de prontidão do backend](docs/PRE_BACKEND_CHECKLIST.md)
- [Runbook de Identity Access](docs/OPERACAO_IDENTITY_ACCESS.md)
- [Roadmap do restante do projeto](docs/ROADMAP.md)
- [Registros de decisões arquiteturais](docs/adr/README.md)

## Estrutura atual

```text
.
├── ARQUITETURA.md
├── docs/
│   ├── AUDITORIA_FRONTEND.md
│   ├── MIGRACAO_FRONTEND.md
│   ├── PRE_BACKEND_CHECKLIST.md
│   └── RELATORIO_PROGRESSO.md
├── backend/                   # API NestJS e módulos B1–B5
├── compose.yaml              # PostgreSQL e Mailpit locais
└── frontend/
    ├── disciplina-pro.html    # protótipo de referência
    ├── protocolo_66_ios (1).html
    └── src/
        ├── app/
        ├── modules/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── discipline-tracker/
        │   ├── gamification/
        │   ├── profile/
        │   ├── programs/
        │   └── projeto66/
```

## Como executar o frontend

Requisitos:

- Node.js compatível com Vite 8;
- npm.

```bash
cd frontend
npm ci
npm run dev
```

A aplicação será disponibilizada normalmente em:

```text
http://localhost:5173/app
```

Não abra `frontend/index.html` diretamente ou por Live Server. O frontend utiliza módulos processados pelo Vite.

Na raiz do workspace, também é possível executar:

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run dev:frontend
npm run dev:backend
```

O backend expõe `GET /api/health`, `GET /api/health/ready` e a documentação OpenAPI em `/docs`.

Em desenvolvimento e testes, chaves RSA efêmeras são geradas por processo. Produção exige `JWT_PRIVATE_KEY_BASE64`, `JWT_PUBLIC_KEYS_JSON`, `JWT_ACTIVE_KID`, `REFRESH_TOKEN_PEPPER` e um `INVITATION_TOKEN_PEPPER` distinto; nenhum desses segredos deve ser versionado. Também exige SMTP autenticado com TLS (`SMTP_HOST`, `SMTP_AUTH_USER`, `SMTP_AUTH_PASSWORD`, `SMTP_FROM` e `SMTP_REQUIRE_TLS=true`), sem aceitar o transporte local. O access token dura 10 minutos, o refresh expira após 7 dias de inatividade e a sessão possui limite absoluto de 30 dias.

Login, refresh e logout usam `POST /api/auth/*` e exigem `Origin` exatamente igual a `FRONTEND_URL`. Em produção, o refresh fica em `__Host-dp_refresh` (`HttpOnly`) e o CSRF em `__Host-dp_csrf`; ambos usam `Secure`, `SameSite=Lax` e `Path=/`. Desenvolvimento usa os nomes sem `__Host-`, pois HTTP local não satisfaz a exigência `Secure` desse prefixo.

O frontend mantém o access token somente em memória e coordena refresh com uma única Promise compartilhada. Requisições concorrentes aguardam essa Promise e não enviam simultaneamente o mesmo refresh token, pois replay revoga a sessão inteira.

Rotas são protegidas por padrão. Somente controllers marcados explicitamente como públicos dispensam bearer token. O guard valida o JWT e consulta o estado atual do usuário e da sessão. Em rotas empresariais, `X-Tenant-Id` continua sendo apenas uma seleção não confiável até o `TenantContextGuard` resolver no banco a membership e o tenant atuais; rotas de plataforma usam contexto separado.

Swagger fica habilitado por padrão apenas fora de produção. Em staging/produção, ele permanece desligado até que `SWAGGER_ENABLED=true` seja configurado deliberadamente em ambiente privado.

### Prisma e primeiro acesso de plataforma

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
```

O bootstrap do primeiro `SUPER_ADMIN` não possui endpoint público e só funciona enquanto não existir acesso de plataforma ativo:

```bash
export SUPER_ADMIN_EMAIL='admin@example.com'
read -rsp 'Senha inicial: ' SUPER_ADMIN_PASSWORD && export SUPER_ADMIN_PASSWORD
npm run platform:bootstrap --workspace backend
unset SUPER_ADMIN_PASSWORD
```

A senha deve ter entre 15 e 128 caracteres. Não coloque credenciais no repositório, em `.env.example` ou diretamente na linha do comando.

Chaves, rotação, migrations, cookies, limpeza de sessões e verificação pré-deploy estão no [runbook de Identity Access](docs/OPERACAO_IDENTITY_ACCESS.md).

### Processamento de eventos internos

O worker pode ser acionado idempotentemente pelo comando:

```bash
npm run events:process --workspace backend
```

Uma entrega em `FAILED` só volta à fila por ação explícita e auditada:

```bash
npm run events:reprocess --workspace backend -- <uuid-da-entrega>
```

Na B6.3, o consumidor `gamification` passou a conceder XP e conquistas a partir dos fatos objetivos registrados pelo servidor. Com tracker e ritual já server-side, a primeira marcação diária de cada comportamento e o primeiro check diário de cada item também entram no ledger pelo mesmo outbox, com 5 XP e proteção contra repetição.

O worker, as métricas protegidas de plataforma, o reprocessamento, backup em R2 e o procedimento de restore estão no [runbook de outbox e recuperação](docs/OPERACAO_OUTBOX_E_RECUPERACAO.md).

## Comandos de qualidade

Na raiz do repositório:

```bash
npm run lint
npm run docs:check
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run test:integration
npm run build
npm run audit:dependencies
```

Antes de um commit funcional, os comandos aplicáveis devem ser aprovados. Mudanças de interface também devem ser verificadas em viewport móvel com Playwright quando o ambiente estiver disponível.

Commits exclusivamente Markdown executam o workflow documental de links e comandos, sem acionar o gate funcional completo. Alterações de código, configuração, dependências ou infraestrutura continuam sujeitas ao gate completo.

## Análise de qualidade

O CI envia análise estática e cobertura LCOV ao SonarQube Cloud no projeto `EduSobreiraa_Disciplina-PRO`. A configuração versionada está em `sonar-project.properties`; o token permanece exclusivamente no secret `SONAR_TOKEN` do GitHub Actions.

### E-mail local de convites

O Compose inclui Mailpit fixado em `v1.30.5`. A interface fica em `http://localhost:8025` e o SMTP em `localhost:1025`.

```bash
docker compose up -d postgres mailpit
npm run test:mailpit --workspace backend
```

Convites são persistidos antes da tentativa SMTP. A mensagem contém o token somente no fragmento `#token=...`; falha de entrega retorna `deliveryStatus: FAILED` e pode ser recuperada por reenvio, que gira o segredo.

A cobertura atual é uma baseline, não um gate retroativo. O Quality Gate deve priorizar bugs, vulnerabilidades, duplicação e cobertura do código novo, aumentando a exigência progressivamente.

## Rotas implementadas

Plataforma:

```text
/login
/app
/app/programas
/app/ritual
/app/missoes
/app/conquistas
/app/protocolo
/app/minha-evolucao
/app/perfil
```

Projeto 66:

```text
/app/programas/projeto66
/app/programas/projeto66/hoje
/app/programas/projeto66/registrar
/app/programas/projeto66/meditar
/app/programas/projeto66/novo-eu
/app/programas/projeto66/jornada
/app/programas/projeto66/progresso
```

Backend de execução:

```text
GET  /api/enrollments
GET  /api/enrollments/:enrollmentId
POST /api/enrollments/:enrollmentId/start
POST /api/enrollments/:enrollmentId/pause
POST /api/enrollments/:enrollmentId/resume
POST /api/enrollments/:enrollmentId/complete
POST /api/enrollments/:enrollmentId/abandon
PUT  /api/enrollments/:enrollmentId/activities/:activityId/completion
PUT  /api/enrollments/:enrollmentId/daily-record
PUT  /api/enrollments/:enrollmentId/private-responses/:activityId
GET  /api/enrollments/:enrollmentId/private-responses/:activityId
```

O frontend consome a API exclusivamente pelo caminho relativo `/api`. No desenvolvimento, o Vite encaminha esse caminho para `localhost:3000`; em produção, `app.disciplinapro.com.br` e, em staging, `staging.disciplinapro.com.br` devem preservar o mesmo proxy de origem. Não haverá `api.disciplinapro.com.br` no MVP: o gateway encaminha `/api` internamente para que cookies `__Host-`, CSRF e refresh funcionem sem expor tokens ao JavaScript.

## Princípios de implementação

- mobile-first;
- fidelidade às identidades visuais dos protótipos;
- componentes, regras e persistência separados;
- conteúdo privado fora de relatórios e auditoria;
- indicadores derivados de fatos persistidos;
- programas desacoplados do núcleo da plataforma;
- controllers sem acesso direto ao Prisma;
- autorização sempre combinando role e escopo do recurso.

## Fluxo de versionamento

- trabalhar em mudanças pequenas e coerentes;
- atualizar a documentação junto das decisões arquiteturais;
- executar lint, testes e build;
- revisar `git diff` e evitar artefatos locais;
- usar mensagens de commit descritivas;
- enviar somente mudanças validadas para o repositório remoto.

## Próximas etapas

1. B8 — substituir os repositories locais remanescentes e consolidar o E2E frontend;
2. avançar pelo [roadmap do MVP](docs/ROADMAP.md).

Para materializar idempotentemente a definição oficial do Projeto 66:

```bash
PLATFORM_ACCESS_ID=<uuid-do-super-admin> npm run programs:materialize:projeto66 --workspace backend
```

A CLI publica somente quando o slug está ausente ou quando encontra o mesmo draft; uma identidade ou publicação divergente causa falha explícita. A habilitação por tenant permanece um comando administrativo separado.

## Responsável

Produto da Spark Inteligência Corporativa, desenvolvido por Eduardo com apoio de IA como ferramenta de engenharia e documentação.
