# Relatório técnico de progresso

> Disciplina PRO · Spark Inteligência Corporativa
> Atualizado em 16/07/2026 · Estado: frontend F0–F9 e backend B0, B0.5 e B1.1–B1.3 concluídos

## 1. Visão geral do produto

O Disciplina PRO é uma plataforma B2B SaaS multi-tenant para execução de programas de desenvolvimento e acompanhamento de adesão comportamental. O Projeto 66 é o primeiro programa da plataforma e mantém domínio, navegação e identidade visual próprios.

```text
Disciplina PRO
├── organizações, times e membros
├── catálogo e programas habilitados
├── execução individual
├── tracker comportamental e rituais
├── gamificação
├── relatórios de adesão
└── auditoria
    └── Projeto 66 (primeiro programa)
```

O frontend individual foi migrado dos protótipos HTML para React. A fundação B0 e as dez decisões da B0.5 foram concluídas; o primeiro schema Prisma e `identity-access` iniciam a B1.

## 2. Tecnologias e decisões

| Área | Tecnologia/decisão |
|---|---|
| Frontend | React 19, JavaScript ESM, React Router 7 |
| Build | Vite 8 |
| Qualidade | ESLint 10, `node:test`, Jest, Playwright e SonarQube Cloud |
| Estilos | CSS por módulo, tokens e media queries mobile-first |
| Persistência atual | repositories sobre `localStorage`, temporários |
| Backend | NestJS 11 + TypeScript 5.9, fundação B0 concluída |
| ORM/banco | Prisma 7 + adapter `pg` + PostgreSQL 18 |
| Arquitetura backend | monolito modular em camadas |
| Multi-tenancy | banco compartilhado com isolamento obrigatório por `tenantId` |
| Comunicação futura | API REST e eventos internos do monolito |

Decisões estruturais relevantes:

- Projeto 66 não é o núcleo da plataforma; é um programa global habilitado por tenant.
- Role empresarial pertence a `TenantMembership`, não a `User`.
- Autorização combina role e escopo do recurso.
- Controllers futuros adaptam HTTP; não acessam Prisma nem acumulam regras.
- Conteúdo íntimo não aparece em reporting, auditoria ou metadata.
- Fatos são persistidos; percentuais, streaks, níveis e métricas são derivados.
- Gamificação utiliza transações de XP, não apenas um saldo mutável.
- Microserviços, filas externas, billing, IA e customização de programas estão fora do MVP atual.

## 3. Tipo de codificação aplicado

A migração não copiou os HTMLs como componentes monolíticos. Cada fatia foi dividida por responsabilidade:

```text
modules/<domínio>/
├── components/       apresentação reutilizável dentro do domínio
├── data/             conteúdo e regras declarativas
├── hooks/            coordenação de estado e casos de uso locais
├── pages/            composição das rotas
├── repositories/     adapters de persistência
├── services/         cálculos puros e regras derivadas
└── styles/           identidade visual do módulo
```

Práticas adotadas:

- componentes funcionais e composição;
- estado React em vez de manipulação direta do DOM;
- funções puras para cálculos relevantes;
- repositories impedindo acesso direto ao armazenamento pelos componentes;
- contratos e limites que permitem trocar `localStorage` por API;
- eventos/recompensas identificados por chaves idempotentes;
- transações compensatórias ao desfazer fatos que concederam XP;
- CSS mobile-first e identidades visuais separadas;
- acessibilidade semântica básica: headings, labels, `aria-pressed`, status e alvos de toque;
- mudanças pequenas, documentadas, testadas e versionadas.

## 4. Progresso por feature

### F0 — Fundação

- shell do Disciplina PRO;
- rotas principais e sessão simulada;
- dashboard, perfil e catálogo;
- entrada e retorno do Projeto 66;
- realinhamento à estética “sala de guerra”.

### F1 — Estrutura do Projeto 66

- layout e rotas aninhadas;
- navegação inferior;
- conteúdo das três fases;
- repository local e estado inicial do ciclo;
- tema iOS/fogo isolado da plataforma.

### F2 — Progresso do Projeto 66

- dia corrente e progresso de 66 dias;
- streak atual e melhor streak;
- progresso por fase;
- heatmap e gráfico de pontuação;
- médias e melhor placar.

### F3 — Registro diário

- seis pilares e placar derivado;
- missões objetivas do dia;
- registro idempotente por `programDay`;
- emoção e gratidão em repository privado separado;
- atualização de progresso e indicadores.

### F4 — Checklist do Projeto 66

- manhã, período do dia e noite;
- progresso por seção e total;
- Dia de Comando;
- persistência e reset confirmado por dia.

### F5 — Ferramentas privadas

- meditação e temporizador resistente a variação de intervalos;
- Novo Eu e check-in pessoal;
- modo crise e respiração;
- registro de dia difícil;
- armazenamento privado separado.

### F6 — Tracker comportamental

- comportamentos configuráveis e limite de 20 ativos;
- grade mensal com rolagem e coluna fixa;
- ciclo vazio, verde e vermelho;
- justificativa e central de pendências;
- rankings, KPIs, dias perfeitos e backup validado.

### F7 — Ritual diário

- abertura, execução, fechamento e revisão semanal;
- fatos persistidos por data e etapa;
- timer 30/30 com oito ciclos;
- pausa, retomada após reload e reset;
- conclusão idempotente dos blocos.

### F8 — Gamificação

- ledger append-only de XP;
- saldo, nível e progresso derivados;
- integrações com tracker, ritual e Projeto 66;
- compensações ao desfazer ações;
- conquistas persistidas como fatos;
- histórico de transações e header dinâmico.

### F9 — Missões e protocolo

- oito missões derivadas do tracker, ritual e ledger;
- períodos mensais, semanais e vitalícios;
- resgate de recompensa idempotente;
- critérios de pontuação;
- seis leis do painel;
- conteúdo migrado sem criar fonte paralela de XP.

## 5. Rotas atuais

Plataforma:

```text
/login
/app
/app/ritual
/app/missoes
/app/programas
/app/minha-evolucao
/app/conquistas
/app/protocolo
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

## 6. Persistência e privacidade atuais

O frontend utiliza chaves locais separadas para tracker, ritual, ciclo do Projeto 66, conteúdo privado e gamificação. Componentes não acessam `localStorage` diretamente.

Essa separação oferece um bom limite arquitetural, mas não constitui segurança de produção. `localStorage` é legível pelo navegador e será substituído por APIs autenticadas. O backend deverá garantir a privacidade nos modelos, casos de uso, DTOs e queries, independentemente do que a interface exiba.

## 7. Procedimento de criação

Cada feature seguiu este ciclo:

1. leitura do protótipo e inventário de conteúdo, estado e regras;
2. definição do ownership e do limite de domínio;
3. extração de regras para funções puras;
4. criação do repository/adaptador de persistência;
5. criação de hook coordenador;
6. composição de componentes e página;
7. CSS mobile-first preservando a estética original;
8. integração às rotas e demais módulos;
9. testes unitários das regras;
10. teste funcional e responsivo no navegador;
11. lint, build, revisão de diff e documentação;
12. commit descritivo e push para `main`.

## 8. Estratégia e procedimentos de teste

### Testes unitários

São executados com `node:test` e `assert/strict`. Cobrem atualmente:

- estatísticas, rankings e backup do tracker;
- progresso, streak e pontuação do Projeto 66;
- progresso e timer do ritual;
- ledger, compensações, níveis e conquistas;
- períodos, sequência e métricas de missões.

Comando:

```bash
cd frontend
npm test
```

### Análise estática

O ESLint verifica JavaScript, JSX e regras de hooks React:

```bash
npm run lint
```

### Build de produção

O Vite transforma e empacota todos os módulos para detectar imports, sintaxe e integração quebrados:

```bash
npm run build
```

### Testes funcionais no navegador

Playwright é utilizado para:

- navegar pelas rotas;
- executar ações reais;
- recarregar a página e verificar persistência;
- validar idempotência e compensações;
- inspecionar erros de console;
- medir overflow horizontal;
- identificar controles menores que 44 px;
- capturar telas para inspeção visual.

Matriz responsiva adotada:

| Perfil | Viewport |
|---|---:|
| móvel mínimo | 320×568 |
| móvel de referência | 375×812 |
| tablet | 768×1024 |
| desktop | 1440×900 |

### Testes iniciais do backend

A fundação NestJS possui teste unitário do serviço de saúde e teste HTTP E2E de `GET /api/health`, executados com Jest e Supertest. Na raiz do workspace:

```bash
npm test
npm run test:e2e --workspace backend
npm run test:integration --workspace backend
```

Além do health check, a suíte cobre configuração de ambiente, readiness do PostgreSQL, request ID, contrato de erros e limite de payload. A integração executa uma consulta real no PostgreSQL.

### Cobertura e análise contínua

O workspace gera relatórios LCOV separados em `frontend/coverage/lcov.info` e `backend/coverage/lcov.info`. O GitHub Actions envia esses relatórios ao SonarQube Cloud por análise CI-based, mantendo a análise automática desativada para evitar resultados duplicados.

Baseline de 15/07/2026:

| Camada | Statements/linhas aproximados |
|---|---:|
| Frontend | 19,89% |
| Backend | 33,33% |

Esses números expõem a dívida real de testes e não serão elevados por exclusões artificiais. O primeiro Quality Gate deve incidir sobre código novo; a cobertura total será ampliada progressivamente conforme os módulos migrarem para a API.

### Critério de aceite

Uma feature visual é encerrada somente após fluxo funcional, persistência, responsividade, console, lint, testes e build serem aprovados. A documentação é atualizada no mesmo commit.

## 9. Princípios de produto e engenharia

- **Mobile-first:** toque e telas pequenas são a base.
- **Fidelidade visual:** as duas identidades não são fundidas em um tema genérico.
- **Separação de responsabilidades:** apresentação, coordenação, domínio e persistência têm limites explícitos.
- **Fatos antes de agregados:** métricas podem ser recalculadas.
- **Idempotência:** reload, edição ou repetição não duplica efeitos.
- **Privacidade por desenho:** gestão acompanha adesão, não conteúdo íntimo.
- **Multi-tenancy por desenho:** toda futura query empresarial terá `tenantId` estabelecido pelo contexto autenticado.
- **Autorização por role e escopo:** Manager não obtém acesso global por possuir apenas a role.
- **Monolito modular:** simplicidade operacional sem perder ownership dos domínios.
- **Documentação viva:** arquitetura e migração acompanham o código.
- **Evolução incremental:** protótipos são migrados em fatias verificáveis.

## 10. Estado real e limitações

Concluído: experiência individual local dos protótipos, modularizada e responsiva.

Ainda não concluído:

- autenticação e autorização reais;
- tenants, memberships, times e convites;
- módulos de negócio e schema Prisma;
- integração persistente entre API e PostgreSQL;
- gestão empresarial e Super Admin;
- relatórios por time/tenant e auditoria real;
- sincronização entre dispositivos;
- proteção server-side de dados privados;
- validação final com leitores de tela e dispositivos físicos.

Os dados e recompensas atuais são locais e simulam contratos futuros. Não devem ser tratados como produção.

## 11. Próxima etapa: backend

A recomendação é iniciar o backend antes das telas administrativas. Ordem proposta:

1. escrever o primeiro `schema.prisma` conforme os ADRs 001–010, gerar a primeira migration e iniciar `identity-access`;
2. implementar login, refresh rotativo, logout e guards de autenticação/contexto;
3. implementar `organizations` e isolamento multi-tenant;
4. implementar `invitations`;
5. implementar catálogo `programs` e habilitação por tenant;
6. implementar `execution` e Projeto 66 por contrato genérico;
7. implementar eventos, `gamification`, `audit` e `reporting`;
8. trocar progressivamente os repositories locais por adapters HTTP;
9. concluir administração, hardening, staging e release do MVP.

A B0.5 é um gate: banco e autenticação dependem de decisões explícitas de domínio e segurança. O plano completo, seus entregáveis e critérios de saída estão em `docs/ROADMAP.md`.

A B0.5 está concluída com dez decisões aprovadas nos ADRs 001–010. O bloco final definiu JWT curto sem autorização embarcada, refresh token opaco e rotativo com detecção de reutilização e transporte híbrido protegido por CORS estrito e CSRF assinado. O primeiro schema e `identity-access` estão liberados para a B1.

A B1 foi dividida em sete gates: contrato do schema, baseline/Prisma, identidade e credenciais, núcleo de sessões, contrato HTTP, guard/principal atual e hardening. Essa ordem mantém autenticação separada da autorização organizacional, que começa somente na B2.

B1.1–B1.3 foram concluídas em 16/07/2026. O schema inicial cobre identidade, tenant mínimo, acesso de plataforma, sessões, refresh e auditoria; a baseline foi aplicada em banco descartável vazio; `PrismaModule` substituiu a conexão técnica da B0. Identidade usa e-mail canônico, Argon2id e bootstrap único do primeiro `SUPER_ADMIN`, protegido por lock transacional e `AuditEvent` imutável.

## 12. Prontidão e pré-requisitos do backend

### Aprovados

| Pré-requisito | Estado verificado |
|---|---|
| Runtime | Node.js 24.18.0 LTS e npm 11.16.0 |
| Containers | Docker 29.6.0 e Docker Compose 5.3 |
| Banco local | PostgreSQL 18.4 em container saudável |
| Cliente SQL | `psql` 18.3; conexão autenticada e consulta SQL aprovadas |
| Versionamento | Git 2.55.0; leitura pelo GitHub MCP; commit e push operacionais |
| Workspace | npm workspaces para `frontend` e `backend`, com lockfile único |
| Backend | NestJS, TypeScript, Prisma 7.8.0 com adapter `pg`, Argon2id e Supertest |
| Segurança básica | Helmet, CORS, throttling, validação global e redação de headers sensíveis |
| Observabilidade inicial | logging estruturado, health check e Swagger |
| Qualidade | lint, typecheck, builds, 29 testes unitários, 3 E2E e 2 integrações aprovados até B1.3 |
| Dependências | zero vulnerabilidades altas/críticas; três avisos moderados na cadeia de desenvolvimento do Prisma CLI |

### Não bloqueadores no fluxo atual

- Dependabot e CodeQL foram retirados por limitações do plano/repositório privado; a compensação atual é `npm audit` local, devendo ser incorporado ao CI.
- O GitHub CLI ainda precisa de nova autenticação, mas Git e GitHub MCP já permitem o trabalho necessário.
- MCP de PostgreSQL, Sentry, provedor de e-mail e hospedagem não são necessários para concluir a B0.
- Prisma 7.8.0 fixa `@hono/node-server` 1.19.11 via `@prisma/dev`; o advisory moderado afeta `serveStatic`, não usado pelo NestJS nem pelo runtime de produção. O downgrade forçado para Prisma 6 foi rejeitado; atualizar quando a cadeia oficial incorporar a correção.
- Riscos, limitações e dependências adiadas passaram a ser governados pelo relatório `docs/PROBLEMAS_POSTERGADOS.md`.

### Pendências prioritárias

1. implementar B1.4, núcleo de sessão e refresh rotativo;
2. implementar B1.5–B1.7, transporte HTTP, autenticação e hardening;
3. confirmar a primeira execução remota do workflow de CI após o push.

Conclusão de prontidão: **a B0 está concluída e não falta instalação essencial para continuar o backend**. A próxima pendência é arquitetural, não de ambiente ou infraestrutura.

## 13. Conclusão

O frontend individual deixou de ser um conjunto de protótipos HTML e passou a ser uma aplicação React modular, testável, responsiva e preparada para integração. A F9 encerra a migração funcional planejada dos protótipos. O próximo ganho estrutural vem do backend multi-tenant, que substituirá simulações locais e permitirá iniciar as áreas B2B de gestão, relatórios e auditoria.
