# Plano de implementação — correção das issues do SonarCloud

## 1. Objetivo

Levar o projeto `EduSobreiraa_Disciplina-PRO` a um Quality Gate confiável e verde, corrigindo os apontamentos que representam risco ou dívida técnica e registrando como falso positivo somente os casos em que o código atual está semanticamente correto.

O plano usa como referência a análise do commit `2569ab0`, publicada em 05/09/2026 às 21:00 BRT:

- 124 issues abertas;
- 15 bugs e 109 code smells;
- 8 blockers, 12 critical, 87 major e 17 minor;
- cobertura geral de 32,4%;
- cobertura do código novo de 32,15%;
- zero vulnerabilidades e zero security hotspots.

As alterações descritas neste documento ainda não fazem parte dessa análise. O painel somente poderá confirmar o encerramento das issues depois que o código for consolidado em um commit e o workflow analisar exatamente esse SHA.

## 2. Status da execução em 06/09/2026

| Entrega | Estado | Resultado atual |
| --- | --- | --- |
| S1 — Governança do Sonar e CI | Validada no CI | O scan do commit `c9bff77` recebeu a versão `0.1.0`, consumiu os cinco LCOV e bloqueou corretamente o workflow quando o Quality Gate ficou vermelho. |
| S2 — Bugs e blockers | Validada no SonarCloud | A análise do commit `c9bff77` não apresentou issues abertas; as correções e assertions explícitas foram aceitas pelo analisador. |
| S3 — Cobertura | Correção complementar em validação | O primeiro scan mediu 68,9% no código novo. Setup de teste e cliente Prisma gerado foram retirados do escopo, e 10 testes diretos foram adicionados; a estimativa local de linhas novas cobertas passou a 84,3%. |
| S4 — Configuração e segurança | Implementada e validada localmente | Validação de ambiente modularizada, e-mail validado sem regex vulnerável e bootstrap com propagação de falha. |
| S5 — Complexidade backend | Implementada e validada localmente | Worker, eventos, filtro HTTP, mapeadores e entrega Resend foram divididos em funções menores; testes unitários e integrações afetadas foram aprovados. |
| S6 — Diálogos e semântica | Implementada localmente | Três modais migrados para `<dialog>`, região rolável convertida para `<section>` e 17 usos intencionais classificados no Sonar. Chromium e Firefox aprovados; WebKit será confirmado no CI. |
| S7 — Ternários frontend | Implementada localmente | Páginas do Projeto 66, administração, convites, timer, hook e página do tracker foram simplificados. Falta a confirmação pelo próximo scan. |
| S8 — Templates | Implementada localmente | Chaves de advisory lock e textos do heatmap foram extraídos sem concatenar SQL. |
| S9 — Limpeza | Implementada localmente | Optional chaining, `replaceAll`, `Set`, `Number.NaN`, `.at()`, `??=`, imports, aliases e parâmetros não usados foram tratados. |

### Evidências já coletadas

- backend unitário: 48 suítes e 214 testes aprovados; cobertura de linhas de 35,56%;
- backend integração: 36 suítes e 120 testes aprovados; cobertura de linhas de 82,42%;
- backend E2E: 5 suítes e 24 testes aprovados; cobertura de linhas de 57,56%;
- após regenerar os três relatórios, a união dos LCOV do backend contém 3.045 de 3.391 linhas cobertas, ou 89,80%; as CLIs permanecem no escopo e o cliente Prisma gerado foi retirado dos coletores;
- arquivos `*.spec.ts` e `main.ts` foram retirados dos três coletores; nenhum arquivo de teste permanece nos LCOV do backend;
- frontend: infraestrutura Vitest/jsdom/Testing Library adicionada, com 40 testes de componente aprovados;
- união dos LCOV do frontend calculada localmente: 1.123 de 2.075 linhas, ou 54,12%;
- fase de cobertura completa em 06/09/2026: 48 suítes e 214 testes unitários do backend, 59 testes unitários do frontend e 30 testes de componentes aprovados; os cinco LCOV configurados no Sonar foram encontrados, estão preenchidos e referenciam somente fontes existentes;
- fase de integração completa em 06/09/2026: banco isolado criado, 14 migrations aplicadas e 36 suítes com 120 testes aprovados; o LCOV de integração foi regenerado, sem fontes ausentes ou arquivos de teste, e a união do backend permaneceu em 3.045 de 3.391 linhas, ou 89,80%;
- fase E2E completa em 06/09/2026: banco `disciplina_pro_e2e` reconstruído, 5 suítes e 24 testes backend aprovados e LCOV E2E regenerado; no frontend, 105 execuções Playwright passaram em Chromium desktop/mobile e uma jornada de privacidade foi ignorada intencionalmente no projeto mobile, pois sua execução funcional ocorre no desktop e a responsividade é coberta pela matriz dedicada;
- fase de auditoria de dependências em 06/09/2026: o gate inicialmente aprovou por não haver alertas altos ou críticos, mas a auditoria bruta revelou duas ocorrências moderadas da mesma cadeia `prisma > mysql2`; o override transitivo foi atualizado de `mysql2@3.22.0` para a primeira versão corrigida, `3.23.1`, preservando o Prisma 7.9.1. A repetição do gate e da auditoria bruta confirmou zero vulnerabilidades em todas as severidades; `prisma validate` e typecheck também passaram;
- primeira consolidação da fase 5: commit `c9bff77` enviado para `main`; o workflow `34031337317` aprovou instalação limpa, geração e migrations Prisma, lint, typecheck, coberturas unitária/E2E/integração e o upload do Sonar para o mesmo SHA;
- o Quality Gate bloqueou corretamente esse workflow por uma única condição: 68,9% de cobertura no código novo, diante da meta de 80%; a consulta de issues retornou zero itens abertos;
- correção complementar de cobertura: `frontend/src/test/**` passou a ser classificado como teste, `backend/src/generated/**` foi excluído dos coletores e foram adicionados 10 testes para `DisciplineTrackerPage`, `JustificationDialog`, `MembershipAdministrationPanel`, `RitualTimer` e `PlatformAdministrationPage`;
- após a correção complementar, 11 arquivos e 40 testes de componente passaram; a cobertura de componentes chegou a 504 de 1.442 linhas, ou 34,95%, e a interseção local entre os cinco LCOV e as linhas novas desde `2569ab0` estimou 397 de 471 linhas, ou 84,3%;
- `InvitationAcceptancePage`: nove cenários de componente aprovados e 58 de 62 linhas cobertas, ou 93,55%;
- `useTenantAdministration`: seis cenários de hook aprovados e 58 de 59 linhas cobertas, ou 98,31%;
- `useDailyRitual`: cinco cenários de hook aprovados e 61 de 63 linhas cobertas, ou 96,83%;
- `Projeto66Provider`: seis cenários de provider aprovados e 58 de 59 linhas cobertas, ou 98,31%;
- Playwright: quatro cenários do diálogo de crise aprovados no Chromium e dez testes de compatibilidade aprovados no Firefox;
- acessibilidade: 20 cenários com axe, teclado e responsividade aprovados na matriz desktop Chromium/Firefox após a alteração do tracker;
- `javascript:S6845` do tracker classificado e confirmado como `FALSE_POSITIVE` no SonarCloud, pois o foco permite rolagem horizontal da tabela pelas setas do teclado;
- tracker frontend: lint, três testes unitários e quatro cenários Playwright no Chromium aprovados após a refatoração de apresentação e semântica;
- refatorações backend: três suítes e 30 testes unitários aprovados para filtro HTTP, eventos e Resend;
- integrações afetadas: 15 suítes e 75 testes aprovados para execution, eventos, convites, organizações, programas, ritual e tracker;
- validação estática completa do estado atual aprovada: `npm run lint`, `npm run typecheck` e `npm run build` passaram nos workspaces frontend e backend;
- WebKit não iniciou localmente por ausência de bibliotecas nativas e indisponibilidade de `sudo` não interativo; o workflow do CI já instala essas dependências.

### Próximas tasks curtas

O restante será executado em blocos independentes, com validação e relato ao final de cada bloco:

1. consolidar a correção complementar de cobertura, atualizar o Graphify e conferir novamente o SonarCloud;
2. confirmar os projetos WebKit no CI depois da aprovação do Quality Gate;
3. encerrar a fase 5 quando o mesmo SHA estiver verde no CI e no SonarCloud.

## 3. Decisões de implementação

1. O Quality Gate passará a bloquear o CI.
2. O scan será executado depois das coberturas unitária, de integração e E2E do backend e antes do E2E do frontend, para publicar todos os relatórios LCOV disponíveis.
3. A versão do projeto será enviada ao Sonar; o período de código novo não continuará preso à versão `not provided` de 16/07/2026.
4. Não serão criados testes redundantes apenas para elevar cobertura. Primeiro será incorporada ao Sonar a cobertura das suítes que já exercitam o código.
5. `role="status"` será mantido em mensagens assíncronas. Trocar esses elementos por `<output>` pioraria a semântica.
6. Estados React comparados com strings serão inicializados e limpos com uma string vazia, preservando o comportamento e removendo a inferência incorreta do analisador.
7. Refatorações de complexidade serão precedidas por testes de caracterização dos fluxos afetados.
8. Não serão adicionadas exclusões de cobertura para regras de negócio, providers, hooks ou repositórios.

## 4. Ordem de execução

### Entrega S1 — Governança do Sonar e do CI

**Status:** validada no GitHub Actions; o bloqueio do Quality Gate foi comprovado
**Prioridade:** P0
**Dependências:** nenhuma
**Arquivos principais:** `.github/workflows/ci.yml`, `sonar-project.properties`, `package.json`

Implementação:

1. Mover o scan do Sonar para depois de `npm run test:coverage`, `test:e2e:coverage` e `test:integration:coverage` do backend.
2. Configurar `sonar.qualitygate.wait=true` e um timeout explícito.
3. Enviar `sonar.projectVersion` a partir da versão do pacote/release.
4. Configurar no SonarCloud:
   - branch `main`: código novo desde a versão anterior;
   - pull requests: comparação com `main`.
5. Confirmar que o token continua existindo somente no secret do GitHub Actions.
6. Documentar que sucesso do scanner significa upload concluído; aprovação depende do Quality Gate.

Validação:

- disparar o workflow manualmente;
- confirmar que o SHA analisado é o SHA do workflow;
- comprovar que um gate vermelho deixa o job vermelho;
- confirmar que uma falha E2E posterior não impede a publicação da análise.

Critério de aceite:

- nenhuma análise nova com `projectVersion: not provided`;
- CI e Quality Gate apresentam o mesmo resultado de qualidade.

### Entrega S2 — Bugs e blockers

**Status:** validada no SonarCloud; zero issues abertas no scan do commit `c9bff77`
**Prioridade:** P0
**Dependências:** S1; consolidação das mudanças locais de `mission-metrics.ts`
**Resultado esperado:** remover ou resolver 15 bugs e 8 blockers

Implementação de código:

1. `typescript:S2871`: usar `localeCompare` na ordenação de datas ISO em `mission-metrics.ts`.
2. `javascript:S9011`: declarar `type="submit"` nos dois botões de `PlatformAdministrationPage.jsx`.
3. `javascript:S6959`: fornecer valor inicial ao `reduce()` de `scoring.js`.
4. `javascript:S2259`: adicionar guarda explícita para `transition` em `MembershipAdministrationPanel.jsx`.
5. `typescript:S3516`: usar um contador numérico em `ProcessInvitationNoticesUseCase` e retornar `{ processed }` ao final.
6. `typescript:S2699`: substituir assertions implícitas do Supertest por verificações explícitas do Jest nos sete testes sinalizados. Preservar a validação do status e, quando aplicável, validar também o código de erro.

Tratamento aplicado a `javascript:S3403`:

1. Inicializar `saving`, `saveError` e `savingOutcome` com string vazia.
2. Limpar esses estados novamente com string vazia, mantendo consistente o tipo observado pelo analisador e em runtime.

Testes:

- testes unitários de métricas e scoring;
- testes de administração frontend;
- `security-configuration.spec.ts`;
- integrações de audit, authentication guard, organization guards e webhook Resend;
- lint e typecheck completos.

Critério de aceite:

- zero bugs abertos;
- zero blockers abertos;
- reliability rating A no código novo.

### Entrega S3 — Cobertura observável e confiável

**Status:** correção complementar concluída localmente; nova medição do Sonar pendente
**Prioridade:** P0
**Dependências:** S1
**Arquivos principais:** scripts dos workspaces, configurações Jest, configuração de testes frontend e `sonar-project.properties`

Backend:

1. Gerar relatórios LCOV separados para testes unitários, integração e E2E.
2. Incluir os três relatórios em `sonar.javascript.lcov.reportPaths`.
3. Executar uma análise para medir quanto das 3.658 linhas hoje consideradas descobertas já é exercitado pelas suítes existentes.
4. Criar testes adicionais apenas para os caminhos que continuarem descobertos.

Resultado da instrumentação:

- os três LCOV usam o mesmo conjunto de fontes produtivas e não incluem arquivos `*.spec.ts`;
- a cobertura combinada estimada do backend é 89,80%;
- `internal-event-processing.integration-spec.ts` passou a comparar métricas globais com o estado anterior do banco, evitando depender de uma contagem absoluta deixada por outras suítes;
- a suíte completa foi validada em banco novo: 48 suítes unitárias, 36 de integração e 5 E2E aprovadas;
- repetir todas as integrações no mesmo banco ainda encontra colisões em fixtures antigas de sessão, bootstrap de identidade e schema de convites. O CI cria um banco limpo, mas tornar essas três fixtures repetíveis deve ser tratado fora da correção do escopo LCOV.

Ordem de cobertura adicional no backend:

1. `prisma-execution.repository.ts` — 168 linhas descobertas;
2. `prisma-membership-administration.repository.ts` — 107;
3. `prisma-tracker.repository.ts` — 99;
4. `tracker.use-cases.ts` — 93;
5. `prisma-program-administration.repository.ts` — 87.

Frontend:

1. Manter `node:test` e c8 para funções puras.
2. Adicionar Vitest, ambiente DOM e React Testing Library para componentes, hooks e providers.
3. Gerar LCOV separado e combinar os caminhos na configuração do Sonar.
4. Priorizar comportamento e estados observáveis, evitando snapshots extensos.

Análise local após a primeira instrumentação:

| Arquivo | Linhas cobertas | Linhas executáveis | Cobertura | Próxima ação |
| --- | ---: | ---: | ---: | --- |
| `InvitationAcceptancePage.jsx` | 58 | 62 | 93,55% | Concluída: link inválido, sessão em carregamento, nova identidade, identidade existente e erros de submissão cobertos. |
| `useTenantAdministration.js` | 58 | 59 | 98,31% | Concluída: autorização, carga, reload, mutações, falhas e troca de tenant cobertos. |
| `useDailyRitual.js` | 61 | 63 | 96,83% | Concluída: carga, reload, checklist, timer, falhas, timezone e atualização após expiração cobertos. |
| `Projeto66Provider.jsx` | 58 | 59 | 98,31% | Concluída: carga, ciclo, registros, checklist, conteúdo privado, falhas e troca de tenant cobertos. |
| `DisciplineTrackerPage.jsx` | 0 | 67 | 0% | Reavaliar depois dos hooks; o comportamento crítico já possui Playwright. |
| `GamificationProvider.jsx` | 44 | 60 | 73,33% | Completar falha, reload, limpeza do aviso e mudança de sessão depois dos módulos sem cobertura. |

O primeiro módulo escolhido foi `InvitationAcceptancePage.jsx`. Ele possuía o maior número absoluto de linhas descobertas no frontend e também concentrava a maior alteração desta leva, com 66 linhas adicionadas e 29 removidas. Os nove testes de componente adicionados reproduzem os contratos críticos já exercitados no E2E e elevam a cobertura instrumentada da página para 93,55%.

O `c8` unitário passou a incluir somente arquivos `.js` sem hooks. Arquivos `.jsx` e hooks React ficam sob a instrumentação do Vitest, evitando que dois instrumentos com granularidades de linha diferentes contabilizem o mesmo código duas vezes. Os dois LCOV continuam combinados pelo Sonar.

Ordem de cobertura adicional no frontend:

1. `GamificationProvider.jsx` — 116 linhas descobertas;
2. `useTenantAdministration.js` — 105;
3. `Projeto66Provider.jsx` — 99;
4. `useDailyRitual.js` — 84;
5. `AppProvider.jsx` — 73;
6. `useDisciplineTracker.js` — 66.

Critério de aceite:

- LCOV representa unitários, integrações e E2E do backend;
- providers e hooks prioritários possuem testes diretos;
- cobertura do código novo igual ou superior a 80%;
- nenhuma regra de negócio excluída da cobertura.

### Entrega S4 — Configuração, segurança e inicialização

**Status:** implementada e validada localmente
**Prioridade:** P1
**Dependências:** S2 e testes de caracterização
**Regras principais:** `S8786`, `S5869`, `S3776`, `S7785`

Implementação:

1. Extrair a validação de Resend, SMTP e produção de `validateEnvironment`.
2. Centralizar a validação de endereços de e-mail em uma função sem backtracking ambíguo.
3. Remover caracteres redundantes nas classes da expressão regular.
4. Cobrir limites de tamanho, espaços, múltiplos `@`, domínio ausente e valores válidos.
5. Substituir `void bootstrap()` por top-level `await` em `backend/src/main.ts`.

Critério de aceite:

- `validateEnvironment` com complexidade cognitiva de no máximo 15;
- nenhuma ocorrência `S8786` ou `S5869`;
- falha de bootstrap propagada como falha do processo.

### Entrega S5 — Complexidade do backend

**Status:** implementada e validada localmente
**Prioridade:** P1
**Dependências:** S3 para que os testes de caracterização sejam contabilizados

Refatorar na seguinte ordem:

1. `http-exception.filter.ts`: extrair resolução de status, código, mensagem, detalhes e captura Sentry — complexidade atual 37.
2. `run-internal-events-worker.ts`: separar criação da aplicação, execução de um ciclo, espera e reinício — 27.
3. `process-internal-events.use-case.ts`: extrair processamento de claim, reagendamento e logging — 26.
4. `invitation-error.mapper.ts`: separar identificação da exceção e construção da resposta HTTP — 21.
5. `platform-programs.controller.ts`: extrair mapeamento de erros — 17.
6. `tracker.controller.ts`: extrair mapeamento de erros — 17; executar depois da consolidação do trabalho local.
7. `resend-invitation-delivery.ts`: separar preflight, request, classificação da resposta e persistência — 16.

Critério de aceite:

- todas as funções sinalizadas com complexidade até 15;
- contratos HTTP, códigos de erro, retries e logs preservados;
- testes dos caminhos de sucesso, falha permanente, falha temporária, ambiguidade e lease perdido.

### Entrega S6 — Diálogos e semântica do frontend

**Status:** implementada localmente; confirmação WebKit no CI pendente
**Prioridade:** P1/P2
**Dependências:** testes frontend da S3

Implementação:

1. Criar uma abstração compartilhada baseada em `<dialog>` nativo.
2. Implementar abertura modal, foco inicial, Escape, restauração de foco e fechamento controlado.
3. Migrar nesta ordem:
   - `JustificationDialog`;
   - `CrisisSupportDialog`;
   - diálogo de `MembershipAdministrationPanel`.
4. Trocar a região rolável do tracker por `<section aria-label="Tabela de comportamentos por dia">`.
5. Manter `tabIndex={0}` na região rolável e registrar `javascript:S6845` como uso intencional. A classificação foi confirmada como `FALSE_POSITIVE` após 20 cenários aprovados no Chromium e Firefox; o WebKit será confirmado na matriz do CI.
6. Manter as 16 ocorrências de `role="status"` e registrá-las como falso positivo/aceitas, pois representam loading ou notificações assíncronas, não resultados de cálculo de formulário. Essa classificação já foi aplicada no SonarCloud com justificativa individual.

Testes:

- abertura e fechamento por teclado;
- contenção e restauração de foco;
- Escape;
- submit e cancelamento;
- axe;
- Playwright em Chromium, Firefox e WebKit.

Critério de aceite:

- três ocorrências de `role="dialog"` encerradas por implementação nativa;
- região semântica corrigida;
- usos intencionais documentados no Sonar sem alteração inadequada para `<output>`.

### Entrega S7 — Ternários e apresentação frontend

**Status:** implementada localmente; confirmação pelo próximo scan pendente
**Prioridade:** P2
**Dependências:** S6; consolidação do trabalho local do tracker
**Regras:** 26 ocorrências `javascript:S3358` e uma `javascript:S3776`

Estratégia:

1. Extrair labels e mensagens para funções puras.
2. Calcular estados derivados antes do JSX.
3. Quebrar páginas de linha única em blocos e componentes com responsabilidade clara.
4. Refatorar nesta ordem:
   - `Projeto66NewSelfPage`;
   - `Projeto66OverviewPage`;
   - `Projeto66MeditationPage`;
   - `Projeto66RecordPage`;
   - `RitualTimer`;
   - `PlatformAdministrationPage`;
   - `MembershipAdministrationPanel`;
   - `DisciplineTrackerPage` e `useDisciplineTracker` por último.

Critério de aceite:

- nenhuma expressão ternária aninhada sinalizada;
- `Projeto66OverviewPage` com complexidade até 15;
- textos, classes, estados disabled e ações preservados por testes.

### Entrega S8 — Persistência e templates

**Status:** implementada localmente
**Prioridade:** P2
**Dependências:** S5
**Regras:** 11 ocorrências TypeScript e uma JavaScript de `S4624`

Implementação:

1. Extrair as chaves usadas em advisory locks para variáveis nomeadas antes dos tagged templates Prisma.
2. Extrair títulos e textos condicionais do `ProgramHeatmap` antes do JSX.
3. Aplicar a mesma transformação nos repositórios de execution, invitations, organizations, programs, ritual e tracker.
4. Manter queries parametrizadas; não concatenar SQL manualmente.

Critério de aceite:

- nenhuma ocorrência de template literal aninhado;
- mesmas chaves de lock e mesmas queries geradas;
- testes de concorrência e integração aprovados.

### Entrega S9 — Limpeza de baixa prioridade

**Status:** implementada localmente
**Prioridade:** P3
**Dependências:** entregas anteriores

Resolver preferencialmente quando o arquivo já estiver sendo alterado:

- seis optional chains (`S6582`);
- quatro usos de `replaceAll()` (`S7781`);
- dois parâmetros marcados com `void` (`S3735`), renomeando-os para `_context` e mantendo a fronteira de autorização;
- duas importações duplicadas (`S3863`);
- `Number.NaN`, `.at()`, `??=`, alias de tipo e `Set`;
- mover `parse` para fora de `createSessionClient`;
- corrigir a ordem/default de parâmetros de `getCurrentStreak` sem quebrar os chamadores.

Critério de aceite:

- nenhuma issue minor/major restante que tenha correção sem mudança de comportamento;
- nenhuma alteração apenas cosmética acompanhada de mudança funcional não relacionada.

## 5. Estratégia de commits e pull requests

Cada entrega deve formar um PR independente ou, quando pequena, um commit isolado dentro de um PR temático. A ordem recomendada é:

1. `ci(sonar): enforce quality gate and project version`
2. `fix(quality): resolve sonar bugs and blocker tests`
3. `test(coverage): publish integration and component coverage`
4. `refactor(config): simplify environment validation`
5. `refactor(events): reduce worker and processing complexity`
6. `refactor(http): simplify exception mapping`
7. `fix(a11y): use native modal dialogs`
8. `refactor(frontend): remove nested presentation logic`
9. `refactor(persistence): remove nested SQL templates`
10. `chore(quality): finish sonar cleanup`

As próximas alterações serão executadas uma task por vez, com validação direcionada e um checkpoint antes do bloco seguinte. Na consolidação, os commits devem manter separados CI, cobertura, backend, acessibilidade e apresentação frontend sempre que o estado atual do worktree permitir.

## 6. Validação por entrega

Para cada entrega:

1. executar lint e typecheck dos workspaces afetados;
2. executar testes unitários diretamente relacionados;
3. executar integrações quando houver persistência, autenticação, e-mail ou fronteiras HTTP;
4. executar Playwright quando houver UI ou acessibilidade;
5. executar build;
6. publicar análise Sonar do mesmo SHA;
7. conferir issues encerradas, issues novas e Quality Gate;
8. atualizar o grafo do projeto após alterações de código.

Antes de concluir o plano completo:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test:coverage`;
- `npm run test:e2e`;
- `npm run test:integration`;
- matriz Firefox/WebKit;
- `npm run build`;
- `npm run audit:dependencies`;
- SonarCloud no mesmo SHA.

## 7. Critério de conclusão

O trabalho estará concluído quando:

- o Quality Gate estiver verde e bloquear regressões;
- bugs, blockers e criticals estiverem zerados;
- as funções sinalizadas tiverem complexidade de no máximo 15;
- a cobertura do código novo for de pelo menos 80%;
- falsos positivos tiverem justificativa registrada individualmente;
- não houver vulnerabilidades ou hotspots pendentes;
- o painel corresponder ao mesmo commit aprovado pelo CI;
- as alterações locais anteriores tiverem sido preservadas.
