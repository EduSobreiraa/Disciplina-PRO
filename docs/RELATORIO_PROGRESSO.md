# Relatório técnico de progresso

> Disciplina PRO · Spark Inteligência Corporativa
> Atualizado em 03/09/2026 · Estado: frontend F0–F9; backend B0, B0.5 e B1–B9 concluídos; BX.1–BX.3 e recorte técnico disponível da BX.4 encerrados no laboratório; BX.5 iniciada com CI/CD integralmente verde

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

A B8.1 substituiu o catálogo mock do frontend por `GET /api/programs`, usando sessão e tenant selecionado, estados explícitos de loading/vazio/erro/retry e rota derivada do `slug` retornado pelo servidor. Tracker, ritual e Playwright permanecem nas próximas parcelas do B8.

A B8.2.0 adicionou a décima migration com comportamentos pessoais, marcas objetivas e justificativas privadas do tracker. Chaves compostas e constraints impedem vínculos entre tenants/memberships, duplicação diária, nomes ativos duplicados e lifecycle inconsistente; API e adapter React permanecem em B8.2.1–B8.2.2.

A B8.2.1 adicionou o módulo backend `tracker` em camadas, com bootstrap idempotente dos dez comportamentos iniciais, limite transacional de 20 ativos, leitura por intervalo de até 366 dias e rotas pessoais para comportamentos, marcas e justificativa privada. O teste HTTP prova autenticação, tenant, normalização, substituição de falha por sucesso com remoção do texto privado, data futura inválida e comportamento estrangeiro não enumerável. O adapter React permanece para a B8.2.2.

A B8.2.2 substituiu a fonte local da tela do tracker por um adapter HTTP autenticado e tenant-scoped. Cada mês é reconstruído pelo servidor, mutações são serializadas com recarga autoritativa e a interface possui loading, erro e retry. A exportação existente foi delimitada como snapshot mensal; a importação permanece desabilitada até a restauração atômica server-side da B8.2.3.

A B8.2.3 substituiu o snapshot mensal por backup pessoal completo v2 e restauração server-side atômica. O formato usa chaves portáveis em vez de IDs internos, o frontend converte arquivos locais v1, e o backend valida limites, referências, duplicações, datas e justificativas antes da substituição. Integração prova round-trip com novos UUIDs, rejeição sem perda do estado vigente e rollback quando uma constraint falha após as exclusões transacionais.

A B8.3.0 adicionou a décima primeira migration para o ritual diário. Dias e checks usam escopo composto de tenant/membership, a data é única por membership e o banco restringe os oito ciclos, segundos restantes e timestamps do relógio a combinações consistentes. As chaves de seção/item são estáveis e desacopladas dos textos editoriais; aplicação e HTTP permanecem para a B8.3.1.

A B8.3.1 adicionou o módulo backend `ritual`, com catálogo estável de etapas, políticas de data, casos de uso, repository Prisma transacional e contratos OpenAPI. A API lê até 366 dias, define checks idempotentemente e opera iniciar, pausar e reiniciar apenas na data civil atual do tenant. Integração com relógio controlado prova timezone, concorrência, pausa, conclusão única, reset, futuro inválido e isolamento entre tenants.

A B8.3.2 substituiu a fonte local da tela do ritual por um adapter HTTP autenticado e tenant-scoped. O frontend deriva a data civil do timezone da organização, reconstrói checks por chaves estáveis e trata o servidor como autoridade para transições do cronômetro, com estados explícitos de loading, erro, retry e mutação. O repository local permanece temporariamente apenas como entrada da projeção antiga de missões, a ser removida na B8.3.3.

A B8.3.3 adicionou `GET /api/missions/me` como projeção pessoal somente leitura das oito métricas de missão. Mês e semana ISO usam a data civil do tenant; tracker, ritual e XP são agregados sob tenant/membership sem ler justificativas privadas e sem produzir eventos ou recompensas. A tela passou a usar adapter HTTP e os dois repositories locais remanescentes foram removidos. Banco vazio provou resultados reproduzíveis, isolamento entre tenants e nenhuma nova transação de XP.

A B8.4.0 versionou o harness Playwright frontend–API. A configuração coordena Nest e Vite, usa Chromium em projetos desktop e mobile, limita concorrência para o banco compartilhado e retém evidências somente em falha. O primeiro teste abre uma rota privada sem sessão, confirma o redirecionamento e valida o login real nos dois viewports; o CI instala explicitamente apenas o Chromium necessário.

A B8.4.1 adicionou fixture idempotente protegida contra bancos não descartáveis e uma jornada autenticada em ambos os viewports. O navegador prova login, organização corrente, `X-Tenant-Id`, catálogo remoto, entrada no Projeto 66, restauração da sessão em reload/nova página e revogação no logout. O teste detectou e corrigiu a divergência entre o slug canônico `projeto-66` e as rotas antigas `projeto66`; também confirmou que o CORS rejeita a origem alternativa `127.0.0.1`, mantendo a origem exata `localhost`.

A B8.4.2 cobre a execução real e o boundary de privacidade. A interface inicia o ciclo, registra placar, conclui atividade e persiste reflexão; o teste confirma o marcador secreto no endpoint privado e sua ausência nos corpos objetivos enviados, no detalhe do enrollment, reporting pessoal, auditoria pessoal, gamificação e missões. O cenário foi repetido no mesmo banco já mutado para provar compatibilidade com retries; a duplicação funcional no projeto mobile é omitida deliberadamente, pois responsividade completa fecha na B8.4.3.

A B8.4.3 fecha a integração do frontend com uma jornada de projeções server-side em desktop e mobile. O teste marca tracker e ritual, abre um segundo contexto autenticado e prova reconstrução exclusiva pela API, além da atualização das missões derivadas. A instrumentação do navegador não registra acessos a `localStorage`. A suíte completa possui quatro cenários, sete execuções aprovadas e um skip funcional intencional; `PP-002` e `PP-009` atendem seus critérios locais de encerramento.

A B9.1 iniciou a administração B2B com uma rota tenant-scoped para CEO/Manager. O adapter HTTP lista memberships visíveis e, somente para CEO, a estrutura de times; `USER` é redirecionado e Manager não chama a rota de times exclusiva do CEO. A tela apresenta estados de carregamento, erro/retry e vazio com layout responsivo. As demais mutações administrativas permanecem deliberadamente para B9.2–B9.4.

A B9.2 integrou o lifecycle completo de times à área do CEO: criar, renomear, arquivar e restaurar. Cada mutação volta à projeção autoritativa da API; times arquivados permanecem enumeráveis apenas na leitura administrativa para viabilizar restauração. A integração PostgreSQL prova normalização, concorrência, conflito de nome, tenant estrangeiro não enumerável, encerramento dos vínculos ativos, auditoria e transições inválidas.

A B9.3 integrou papéis, status e vínculos de time à administração. A leitura de memberships inclui somente atribuições ativas necessárias à tela. CEO promove/rebaixa Manager, suspende, inativa, reativa, vincula e encerra vínculos; Manager recebe apenas ações permitidas sobre participantes do próprio escopo. Transições exigem motivo, a interface recarrega a API após cada comando e não usa ocultação visual como autorização. A matriz PostgreSQL de seis cenários prova escopo, reuso do vínculo sem duplicação, downgrade de Manager, bloqueio de execução, isolamento e substituição concorrente de CEO na rota separada de plataforma.

A B9.4 integrou convites administrativos à mesma área. CEO convida participante ou Manager para múltiplos times; Manager convida somente participante para times que administra. Listagem, criação, reenvio e revogação respeitam ownership e tenant, a tela mostra expiração e o último resultado do transporte, e nenhum token entra nos contratos frontend. A matriz PostgreSQL de quatro cenários prova duplicidade, membership preexistente, rotação, revogação e primeiro CEO separado; Mailpit comprova a entrega de link utilizável. Resend, retry e bounce permanecem no `PP-015` antes de staging.

A B9.5 integrou reporting e auditoria à área administrativa. CEO alterna entre a visão consolidada do tenant e times ativos; Manager recebe somente os times ativos que administra, derivados de sua própria membership. A interface apresenta métricas objetivas de adesão, progresso e programas, além de eventos recentes com ações curadas, sem renderizar metadados ou respostas privadas. Quatro suítes e treze testes de integração PostgreSQL comprovam os contratos pessoal, por time e por tenant, incluindo autorização negativa e isolamento de escopo.

A B9.6 criou a fronteira visual independente `/plataforma`, acessível apenas por sessão com `SUPER_ADMIN`, inclusive quando a identidade não possui membership empresarial. Consultas globais próprias enumeram tenants, CEO ativo ou convite pendente, programas, versões e habilitações; a interface cria tenants pendentes, convida o primeiro CEO, suspende, reativa ou encerra tenants e alterna programas publicados por organização. Nenhuma chamada de plataforma envia `X-Tenant-Id`, e o superadministrador continua sem acesso implícito às rotas empresariais. Duas suítes com oito testes de integração em banco reconstruído comprovam autorização negativa, lifecycle, concorrência, auditoria e provisionamento.

A B9.7 separou a fixture de navegador em quatro identidades e fechou a matriz administrativa em Chromium desktop/mobile. `USER` é redirecionado, Manager enumera somente o time gerenciado e não recebe controles estruturais, CEO cria time com `X-Tenant-Id`, e `SUPER_ADMIN` consulta/cria pela fronteira global sem esse header. A ampliação revelou que o limite estrito de dez logins por minuto saturava a própria matriz; o backend preserva esse limite fora de testes e usa capacidade ampliada somente quando `NODE_ENV=test`. A suíte Playwright completa possui oito cenários, quinze execuções aprovadas e um skip funcional intencional. A B9 está concluída localmente.

## 2. Tecnologias e decisões

| Área | Tecnologia/decisão |
|---|---|
| Frontend | React 19, JavaScript ESM, React Router 7 |
| Build | Vite 8 |
| Qualidade | ESLint 10, `node:test`, Jest, Playwright e SonarQube Cloud |
| Estilos | CSS por módulo, tokens e media queries mobile-first |
| Persistência atual | sessão com access token em memória/refresh cookie; fontes de verdade de negócio acessadas por APIs autenticadas |
| Backend | NestJS 11 + TypeScript 5.9, B0–B8 implementados e integrados localmente |
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

As telas de tracker, ritual e missões, o ciclo objetivo, as ferramentas privadas do Projeto 66 e a gamificação usam repositories HTTP; a sessão usa access token em memória e refresh por cookie. Nenhum repository local de negócio permanece no frontend.

O backend separa respostas privadas dos fatos objetivos do Projeto 66 e as projeções atuais são server-side. Isso não autoriza uso produtivo: retenção e operação de produção continuam pendentes, embora a prova Playwright frontend–API local esteja versionada e aprovada.

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

Desde a B8.4, `frontend/playwright.config.js` e quatro specs frontend estão versionados. A suíte reproduz no CI sessão, catálogo, execução, privacidade, tracker, ritual e missões em projetos Chromium desktop/mobile; validação assistiva e dispositivos físicos permanecem separados no `PP-010`.

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

- frontend React F0–F9, com autenticação, contexto organizacional, Projeto 66, tracker, ritual, gamificação e missões integrados à API;
- onze migrations cobrindo identidade, organizações, convites, catálogo, execução, eventos internos, gamificação, idempotência de auditoria derivada, tracker e ritual;
- módulos backend `identity-access`, `organizations`, `invitations`, `programs`, `execution`, `tracker` e `ritual`;
- autorização por sessão atual, tenant, role e escopo;
- conteúdo privado do Projeto 66 em tabela, repository, DTOs e rotas próprios;
- definição editorial e materialização idempotente do Projeto 66;
- catálogo visual consumindo as ofertas reais de `GET /api/programs` desde a B8.1.

Ainda não implementado ou não validado:

- PITR/restore dentro do Railway e prova do RPO de 1 hora;
- B10: observabilidade, chaves gerenciadas, acessibilidade assistiva, serviços externos e release;
- validação em staging ou produção.

O `PP-017` foi encerrado na B6.1: controllers e CORS concordam sobre `PUT`, e o preflight cross-origin é exercitado automaticamente sem relaxar a origem permitida.

## 11. Evidência de validação atual

Gate local atualizado em 06/08/2026:

| Verificação | Resultado |
|---|---|
| Runtime/dependências | Node 24.18.0, npm 11.16.0 e `npm ls --workspaces --depth=0` aprovados |
| Prisma | schema válido; onze migrations aplicadas em banco vazio descartável |
| Frontend unitário | 13 testes aprovados |
| Backend unitário | 34 suítes, 106 testes aprovados |
| Integração PostgreSQL | 33 suítes, 90 testes aprovados |
| E2E backend/Supertest | 5 suítes, 20 testes aprovados |
| E2E frontend/Playwright | 23 execuções aprovadas e 1 skip funcional intencional em projetos Chromium desktop/mobile no CI |
| SMTP local/Mailpit | 1 suíte, 1 teste aprovado |
| Qualidade | lint, typecheck, builds e pisos de cobertura aprovados |
| Dependências | auditoria aprovada e Dependabot com zero alertas abertos; PP-016 encerrado |
| Backup lógico externo | job diário Railway → Cloudflare R2 ativo; SHA-256 válido e restore local do artefato de 30/08 aprovado com 33 tabelas recuperadas |
| Monitoramento do backup | execução agendada de 01/09 criou `disciplina-pro-20260901T112923Z.dump`, verificou dump/manifesto no R2 e notificou o heartbeat Better Stack antes do log final; janela 24h + 5h de tolerância |
| Segurança BX.3 | contrato fail-fast, estágio lab sem SMTP fictício, chaves/peppers, proxy, Swagger, redação e Sentry aprovados; 44 suítes/142 testes unitários, 33 suítes/92 testes PostgreSQL e regressão focada posterior de 1 suíte/6 testes; prova Vercel/Railway aprovada |

O Swagger é gerado dinamicamente em `/docs`; não existe arquivo OpenAPI estático versionado. A presença de boundaries organizacionais no documento gerado é coberta por teste, mas não há teste automático comparando todas as rotas narrativas com todo o OpenAPI.

## 12. Próxima etapa e bloqueios

A última fase funcional comprovadamente concluída é a B9. Na preparação pré-staging, BX.1, BX.2 e **BX.3 — segurança e configuração** foram concluídas; em 03/09, o recorte técnico da **BX.4 — observabilidade, jobs e e-mail** possível sem conta corporativa também foi concluído. Sentry frontend/backend, monitores Better Stack, heartbeat automático do backup, worker contínuo, limpeza diária de sessões, traces OpenTelemetry externos e o runbook de incidente estão comprovados. O drill detectou uma rota sintética `404`, enviou alerta por e-mail, foi reconhecido às `20:54 BRT` e recuperou automaticamente sem interromper os serviços reais. A BX.5 foi iniciada e seu gate de CI/CD foi aprovado integralmente no run `33826943847`, incluindo Sonar e auditoria sem alertas. Resend, retry/bounce de convite e canais corporativos permanecem bloqueados pela ausência de domínio/e-mail corporativo.

O desenvolvimento local pode continuar. Dados reais, staging público e produção continuam bloqueados pelos itens P0/P1 do relatório de problemas postergados. Em particular:

- PP-002 e PP-009: encerrados localmente na B8.4 por adapters HTTP e suíte Playwright versionada; a ampliação em staging permanece no B10 sem reabrir esses critérios locais;
- PP-004: políticas centrais aprovadas pela Spark, com implementação, matriz definitiva, contratos e validação jurídica ainda pendentes;
- PP-005–PP-010: ADR 016 fechou fornecedores e parâmetros parciais de PP-006–PP-008, incluindo BetterStack para uptime e alertas; acessos, responsáveis, contratação, implementação, validação jurídica e ensaios continuam pendentes;
- PP-016: encerrado em 03/09/2026 após atualizações compatíveis, auditoria aprovada e confirmação de zero alertas abertos no Dependabot;

O PP-017 está encerrado e não integra os bloqueios remanescentes.

## 13. Auditoria de governança — 26/07/2026

A documentação passou a separar responsabilidades do Desenvolvedor, da Direção da Spark e de validação jurídica futura em [`../GOVERNANCA.md`](../GOVERNANCA.md). Todos os PP possuem classificação, decisor, implementador, aprovador e evidência de encerramento no relatório canônico.

Para o PP-004, foram registradas as políticas aprovadas de retenção do tenant por até 60 dias, `AuditEvent` por 1 ano, anonimização de participante quando juridicamente permitida, atendimento ao titular e canal oficial. O item não foi encerrado: faltam implementação, matriz definitiva por operação, instrumentos jurídicos e validação jurídica.

## 14. Conclusão

O repositório possui frontend React funcional e backend multi-tenant implementado até B9, incluindo eventos, gamificação, auditoria, reporting objetivo, administração e integração frontend–API reproduzível em navegador real. O laboratório também comprovou deploy, backup lógico diário externo, restauração local descartável, monitoramento automático do backup, jobs contínuo e diário, Sentry/Better Stack, segurança/configuração em Vercel/Railway e CI/CD integralmente verde. Isso não equivale a prontidão de produção: os itens restantes da BX.4 e BX.5, PITR/restore Railway, B10 e os riscos explicitamente postergados permanecem necessários.
