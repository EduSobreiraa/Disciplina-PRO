# Relatório técnico de progresso

> Disciplina PRO · Spark Inteligência Corporativa
> Atualizado em 03/08/2026 · Estado: frontend F0–F9; backend B0, B0.5 e B1–B7 concluídos

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

O frontend individual foi migrado dos protótipos HTML para React. A fundação B0, as dez decisões da B0.5 e toda a B1 foram concluídas. A B2 fechou contrato e isolamento multi-tenant, a B3 encerrou o ciclo nominal de entrada e a B4 entregou catálogo e disponibilidade. A B5 encerrou lifecycle, bloqueios, fatos objetivos, respostas privadas, integração HTTP, sessão frontend, definição editorial e jornada E2E de 66 dias.

A B6.0 fechou no ADR 015 o contrato de eventos duráveis e a B6.1 materializou a fundação append-only. A B6.2 integrou os produtores objetivos e o processamento `at-least-once`; a B6.3 adicionou a gamificação server-side. A B6.4 centralizou o contrato de auditoria derivada e expôs leituras pessoal, por time e por tenant sem `metadata` bruta. A B6.5 removeu o ledger de XP do browser, integrou a projeção à API e consolidou a jornada E2E. Respostas privadas continuam sem eventos.

A B7.1 iniciou o módulo `reporting` com a projeção pessoal objetiva em `GET /api/reports/me`. O repository consulta somente enrollments, versões, conclusões e registros diários, revalida a membership corrente e não seleciona respostas privadas.

A B7.2 adicionou `GET /api/reports/teams/:teamId` com agregações nominais objetivas. Manager consulta apenas time sob vínculo gerencial ativo; CEO consulta qualquer time do tenant. Escopos ausente, não gerenciado ou estrangeiro recebem a mesma resposta não enumerável.

A B7.3 adicionou agregações exclusivas do CEO para o tenant e membros inativos. O corte de inatividade é entrada ISO-8601 obrigatória, não uma política temporal inventada no código; exige membership ativa já existente, enrollment e ausência de fatos objetivos desde o corte.

A B7.4 explicitou todos os contratos de resposta no OpenAPI e consolidou a matriz HTTP de autenticação, autorização, tenant, validação e privacidade. Os schemas e corpos públicos não contêm payload privado nem metadata livre; a fase B7 está concluída.

## 2. Tecnologias e decisões

| Área | Tecnologia/decisão |
|---|---|
| Frontend | React 19, JavaScript ESM, React Router 7 |
| Build | Vite 8 |
| Qualidade | ESLint 10, `node:test`, Jest, Playwright e SonarQube Cloud |
| Estilos | CSS por módulo, tokens e media queries mobile-first |
| Persistência atual | híbrida: sessão, Projeto 66 e gamificação via API; tracker e ritual em `localStorage` |
| Backend | NestJS 11 + TypeScript 5.9, B0–B5 e B6.0–B6.4 implementados; B6.5 integrada no frontend |
| ORM/banco | Prisma 7 + adapter `pg` + PostgreSQL 18 |
| Arquitetura backend | monolito modular em camadas |
| Multi-tenancy | banco compartilhado com isolamento obrigatório por `tenantId` |
| Comunicação | API REST e eventos internos duráveis com publicação/processamento implementados |

Decisões estruturais relevantes:

- Projeto 66 não é o núcleo da plataforma; é um programa global habilitado por tenant.
- Role empresarial pertence a `TenantMembership`, não a `User`.
- Autorização combina role e escopo do recurso.
- Controllers adaptam HTTP; não acessam Prisma nem acumulam regras.
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

O frontend utiliza chaves locais separadas somente para tracker e ritual. O ciclo objetivo, as ferramentas privadas do Projeto 66 e a gamificação usam repositories HTTP; a sessão usa access token em memória e refresh por cookie. Componentes não acessam `localStorage` diretamente.

Os adapters locais restantes não constituem persistência de produção. `localStorage` é legível pelo navegador e continuará sendo substituído por APIs autenticadas. O backend já separa respostas privadas dos fatos objetivos do Projeto 66, mas retenção, operação de produção e os módulos locais restantes continuam pendentes.

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

Playwright foi utilizado de forma assistida no gate histórico F0–F9 para:

- navegar pelas rotas;
- executar ações reais;
- recarregar a página e verificar persistência;
- validar idempotência e compensações;
- inspecionar erros de console;
- medir overflow horizontal;
- identificar controles menores que 44 px;
- capturar telas para inspeção visual.

Não há `playwright.config` nem specs frontend versionadas no repositório. Portanto essas verificações visuais não são reproduzidas pelo CI atual; a pendência está registrada no PP-009.

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

Baseline histórica de 15/07/2026:

| Camada | Statements/linhas aproximados |
|---|---:|
| Frontend | 19,89% |
| Backend | 33,33% |

Esses números expõem a dívida real de testes e não serão elevados por exclusões artificiais. O primeiro Quality Gate deve incidir sobre código novo; a cobertura total será ampliada progressivamente conforme os módulos migrarem para a API.

Medição local de 26/07/2026:

| Camada | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Frontend | 26,36% | 66,79% | 48,64% | 26,36% |
| Backend | 32,41% | 31,26% | 36,30% | 34,12% |

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

Implementado e validado localmente:

- frontend React F0–F9, com autenticação, contexto organizacional e Projeto 66 parcialmente integrados à API;
- nove migrations cobrindo identidade, organizações, convites, catálogo, execução, eventos internos, gamificação e idempotência de auditoria derivada;
- módulos backend `identity-access`, `organizations`, `invitations`, `programs` e `execution`;
- autorização por sessão atual, tenant, role e escopo;
- conteúdo privado do Projeto 66 em tabela, repository, DTOs e rotas próprios;
- definição editorial e materialização idempotente do Projeto 66.

Ainda não implementado ou não validado:

- B8: retirada dos repositories locais de tracker e ritual, além de E2E frontend versionado;
- catálogo visual do frontend ainda alimentado por `programs.mock.js`, embora catálogo e ofertas reais existam no backend;
- B9: interfaces administrativas completas;
- B10: infraestrutura, backup/restauração, observabilidade, chaves gerenciadas, acessibilidade assistiva e release;
- validação em staging ou produção.

O `PP-017` foi encerrado na B6.1: controllers e CORS concordam sobre `PUT`, e o preflight cross-origin é exercitado automaticamente sem relaxar a origem permitida.

## 11. Evidência de validação atual

Gate local executado em 03/08/2026:

| Verificação | Resultado |
|---|---|
| Runtime/dependências | Node 24.18.0, npm 11.16.0 e `npm ls --workspaces --depth=0` aprovados |
| Prisma | schema válido; nove migrations aplicadas em banco vazio descartável |
| Frontend unitário | 7 testes aprovados |
| Backend unitário | 33 suítes, 104 testes aprovados |
| Integração PostgreSQL | 28 suítes, 82 testes aprovados |
| E2E backend/Supertest | 5 suítes, 20 testes aprovados |
| SMTP local/Mailpit | 1 suíte, 1 teste aprovado |
| Qualidade | lint, typecheck, builds e pisos de cobertura aprovados |
| Dependências | gate reprovado: 29 advisories, registrados em PP-016 |

O Swagger é gerado dinamicamente em `/docs`; não existe arquivo OpenAPI estático versionado. A presença de boundaries organizacionais no documento gerado é coberta por teste, mas não há teste automático comparando todas as rotas narrativas com todo o OpenAPI.

## 12. Próxima etapa e bloqueios

A última fase funcional comprovadamente concluída é a B7. A próxima implementação é **B8 — integração do frontend**.

O desenvolvimento local pode continuar. Dados reais, staging público e produção continuam bloqueados pelos itens P0/P1 do relatório de problemas postergados. Em particular:

- PP-002: tracker e ritual ainda possuem persistência local; a parcela de gamificação foi encerrada na B6.5;
- PP-004: políticas centrais aprovadas pela Spark, com implementação, matriz definitiva, contratos e validação jurídica ainda pendentes;
- PP-005–PP-010: ADR 016 fechou fornecedores e parâmetros parciais de PP-006–PP-008, incluindo BetterStack para uptime e alertas; acessos, responsáveis, contratação, implementação, validação jurídica e ensaios continuam pendentes;
- PP-016: auditoria de dependências não está verde;

O PP-017 está encerrado e não integra os bloqueios remanescentes.

## 13. Auditoria de governança — 26/07/2026

A documentação passou a separar responsabilidades do Desenvolvedor, da Direção da Spark e de validação jurídica futura em [`../GOVERNANCA.md`](../GOVERNANCA.md). Todos os PP possuem classificação, decisor, implementador, aprovador e evidência de encerramento no relatório canônico.

Para o PP-004, foram registradas as políticas aprovadas de retenção do tenant por até 60 dias, `AuditEvent` por 1 ano, anonimização de participante quando juridicamente permitida, atendimento ao titular e canal oficial. O item não foi encerrado: faltam implementação, matriz definitiva por operação, instrumentos jurídicos e validação jurídica.

## 14. Conclusão

O repositório possui frontend React funcional e backend multi-tenant implementado até B7, incluindo eventos, gamificação, auditoria e reporting objetivo com contratos e matriz HTTP de privacidade. Isso não equivale a produto completo nem a prontidão de produção. B8 é a próxima entrega real; B9–B10 e os riscos explicitamente postergados permanecem futuros.
