# Disciplina PRO

Plataforma B2B SaaS multi-tenant da **Spark Inteligência Corporativa** para acompanhamento comportamental e execução de programas de desenvolvimento.

O **Projeto 66** é o primeiro programa disponível dentro da plataforma. Ele possui domínio e identidade visual próprios, sem estar acoplado ao núcleo do Disciplina PRO.

## Estado do projeto

O projeto está na etapa de migração e modularização do frontend. Os protótipos HTML originais permanecem no repositório como referência visual e funcional.

Já estão disponíveis:

- shell mobile-first do Disciplina PRO;
- catálogo de programas;
- tracker mensal de comportamentos em “Minha evolução”;
- ritual diário com abertura, execução, fechamento, revisão semanal e timer 30/30;
- gamificação com ledger de XP, níveis, conquistas e histórico de transações;
- grade verde/vermelha e justificativas;
- Projeto 66 com ciclo, registro diário, checklist e tracker;
- meditação, respiração, Novo Eu, modo crise e dia difícil;
- separação local entre dados objetivos e conteúdo privado;
- repositories locais preparados para futura substituição pela API.

O backend NestJS concluiu a B0, com ambiente validado, contrato HTTP, PostgreSQL reproduzível, health/readiness, testes reais e CI. A próxima fase é a B0.5; schema Prisma e módulos de negócio aguardam suas decisões arquiteturais.

## Arquitetura planejada

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
- [Inventário e plano de migração do frontend](docs/MIGRACAO_FRONTEND.md)
- [Auditoria do frontend](docs/AUDITORIA_FRONTEND.md)
- [Relatório técnico de progresso](docs/RELATORIO_PROGRESSO.md)
- [Checklist de prontidão do backend](docs/PRE_BACKEND_CHECKLIST.md)
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
├── backend/                   # fundação NestJS concluída
├── compose.yaml              # PostgreSQL local reproduzível
└── frontend/
    ├── disciplina-pro.html    # protótipo de referência
    ├── protocolo_66_ios (1).html
    └── src/
        ├── app/
        ├── modules/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── discipline-tracker/
        │   ├── profile/
        │   ├── programs/
        │   └── projeto66/
        └── shared/            # componentes compartilhados futuros
```

## Como executar o frontend

Requisitos:

- Node.js compatível com Vite 8;
- npm.

```bash
cd frontend
npm install
npm run dev
```

A aplicação será disponibilizada normalmente em:

```text
http://localhost:5173/app
```

Não abra `frontend/index.html` diretamente ou por Live Server. O frontend utiliza módulos processados pelo Vite.

Na raiz do workspace, também é possível executar:

```bash
npm install
cp .env.example .env
docker compose up -d
npm run dev:frontend
npm run dev:backend
```

O backend expõe `GET /api/health`, `GET /api/health/ready` e a documentação OpenAPI em `/docs`.

## Comandos de qualidade

Na raiz do repositório:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run test:integration
npm run build
npm run audit:dependencies
```

Antes de um commit funcional, os comandos aplicáveis devem ser aprovados. Mudanças de interface também devem ser verificadas em viewport móvel com Playwright quando o ambiente estiver disponível.

Commits exclusivamente Markdown passam por revisão de diff e links, sem executar testes, build, cobertura ou SonarQube. Alterações de código, configuração, dependências ou infraestrutura continuam sujeitas ao gate completo.

## Análise de qualidade

O CI envia análise estática e cobertura LCOV ao SonarQube Cloud no projeto `EduSobreiraa_Disciplina-PRO`. A configuração versionada está em `sonar-project.properties`; o token permanece exclusivamente no secret `SONAR_TOKEN` do GitHub Actions.

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

## Princípios de implementação

- mobile-first;
- fidelidade às identidades visuais dos protótipos;
- componentes, regras e persistência separados;
- conteúdo privado fora de relatórios e auditoria;
- indicadores derivados de fatos persistidos;
- programas desacoplados do núcleo da plataforma;
- controllers futuros sem acesso direto ao Prisma;
- autorização sempre combinando role e escopo do recurso.

## Fluxo de versionamento

- trabalhar em mudanças pequenas e coerentes;
- atualizar a documentação junto das decisões arquiteturais;
- executar lint, testes e build;
- revisar `git diff` e evitar artefatos locais;
- usar mensagens de commit descritivas;
- enviar somente mudanças validadas para o repositório remoto.

## Próximas etapas

1. concluir a fundação técnica B0;
2. executar a B0.5 e fechar as decisões que governam schema e autenticação;
3. gerar o primeiro schema/migration e iniciar `identity-access`;
4. avançar pelo [roadmap do MVP](docs/ROADMAP.md).

## Responsável

Produto da Spark Inteligência Corporativa, desenvolvido por Eduardo com apoio de IA como ferramenta de engenharia e documentação.
