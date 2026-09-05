# BX — Preparação pré-staging em laboratório

> Decisão operacional registrada em 23/08/2026. Esta fase não autoriza dados reais, domínio corporativo, billing corporativo nem considera staging oficial implantado.

**Estado em 05/09/2026:** BX.1, BX.2 e BX.3 concluídas no recorte de laboratório. Na BX.4, Sentry frontend/backend, monitores Better Stack, backup diário R2 com heartbeat automático, worker contínuo de eventos, limpeza diária de sessões, OpenTelemetry externo e runbook de incidente foram comprovados. Um drill controlado abriu incidente por HTTP `404`, enviou alerta por e-mail, foi reconhecido, diagnosticado e recuperado automaticamente sem indisponibilidade real. A BX.4 permanece aberta somente nos itens de Resend, retry/bounce e canal corporativo bloqueados até existir domínio/e-mail corporativo. Na BX.5, o pipeline CI/CD está integralmente verde e os smokes externos público e autenticado foram comprovados em desktop e mobile, sem reset ou escrita de negócio. O PITR Railway e o ensaio de recuperação dentro da infraestrutura Railway permanecem obrigatórios antes do lançamento, quando o plano contratado permitir.

## Objetivo

Implementar, testar e documentar tudo que for possível antes da criação das contas corporativas. Contas pessoais/técnicas podem ser usadas exclusivamente como laboratório; staging e produção definitivos serão recriados nas contas da empresa, com credenciais novas.

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Frontend | Vercel |
| API e PostgreSQL | Railway |
| Staging | privado |
| API | rewrite same-origin `/api` no Vercel para a API Railway |
| Railway inicial | Hobby; sem upgrade Pro preventivo |
| RPO | máximo de 1 hora, sustentado por PITR Railway validado em ensaio |
| Recuperação | PITR + backup Railway como camada adicional + dump lógico diário no R2 |
| Backup independente | PostgreSQL lógico diário para Cloudflare R2 |
| Retenção R2 | 90 dias, preferencialmente por Lifecycle Rule |
| Alertas | Eduardo exclusivamente |

O dump diário no R2 é uma camada independente de disaster recovery; ele não substitui a janela de RPO de uma hora fornecida pelo PITR.

## Regras do laboratório

- usar somente dados, tenants, usuários e e-mails fictícios;
- ativar 2FA e recuperação segura em toda conta temporária;
- não usar `disciplinapro.com.br`, dados reais ou remetente corporativo sem autorização;
- nunca mover tokens, chaves JWT, peppers, credenciais de banco ou chaves R2 do laboratório para a empresa;
- documentar configuração, permissões mínimas, variáveis sem valor, testes e custo observado;
- recursos finais serão recriados ou transferidos apenas se o fornecedor suportar transferência segura de propriedade e billing.

## BX.1 — Candidato, deploy e topologia

- congelar candidato por commit/tag, com worktree limpo e gates aprovados;
- preparar build e deploy privado do frontend Vercel;
- preparar build, start command, healthcheck e readiness da API Railway;
- configurar e testar rewrite `/api/*` Vercel → Railway, preservando cookies, CSRF e origem única;
- manter Swagger desligado por padrão em `NODE_ENV=production`; só habilitar `SWAGGER_ENABLED=true` em ambiente privado com acesso restrito;
- preparar migrations serializadas antes do runtime e smoke test pós-deploy.

**Plataformas necessárias:** Vercel e Railway temporários.

## BX.2 — Banco, migrations, dados e recuperação

- separar desenho e testes de credenciais migration/runtime com privilégio mínimo;
- preparar pool, TLS e limites do PostgreSQL Railway; `DATABASE_POOL_MAX` controla o pool de cada processo e deve ser dimensionado por serviço no Railway;
- criar seed determinístico fictício e bootstrap controlado de `SUPER_ADMIN`;
- validar PITR no Railway, incluindo restore em serviço novo e corte manual documentado;
- evoluir e testar `ops/backup/backup-postgres-to-r2.sh` com dump, upload e verificação;
- configurar bucket R2 de laboratório e Lifecycle Rule de 90 dias;
- restaurar backup em banco descartável e registrar evidência;
- documentar rollback/forward-fix de migrations.

**Plataformas necessárias:** Railway e Cloudflare R2 temporários.

**Evidência de encerramento do recorte de laboratório em 30/08/2026:** frontend e API implantados, PostgreSQL Railway populado somente com seed fictício, job diário PostgreSQL → R2 ativo, bucket privado com Lifecycle Rule de 90 dias e primeiro artefato confirmado. O dump `disciplina-pro-20260830T142746Z.dump` e seu manifesto `.sha256` foram baixados, tiveram checksum validado e foram restaurados em PostgreSQL 18 descartável. O ensaio recuperou 33 tabelas, 11 migrations, 4 usuários fictícios, 1 tenant, 3 memberships, 3 enrollments e 30 comportamentos; o container foi removido após a validação.

**Risco residual transferido:** o dump diário comprovado não atende sozinho ao RPO de 1 hora. PITR/WAL, restore em serviço Railway novo, corte manual e aceite formal da evidência continuam no PP-007/B10.3 e bloqueiam produção. O monitoramento de falha do backup foi comprovado posteriormente na BX.4 por heartbeat automático; isso não altera os riscos residuais de PITR e recuperação Railway.

### Seed de laboratório

`npm run lab:seed --workspace backend` prepara de forma idempotente a organização fictícia, Projeto 66 e quatro identidades descartáveis: `SUPER_ADMIN`, CEO, MANAGER e USER. O MANAGER e o USER também pertencem à mesma equipe, para validar permissões de gestão. A seed exige `LAB_SEED_PASSWORD`, `LAB_SEED_CONFIRM=seed-disciplina-pro-lab` e recusa qualquer banco que não seja `disciplina_pro_lab`, `disciplina_pro_staging` ou `disciplina_pro_validation`. Para a conta técnica temporária da Railway, cujo banco padrão é `railway`, exige ainda `LAB_SEED_ALLOW_DEFAULT_RAILWAY_DATABASE=allow-temporary-railway-database`; remova ambas as confirmações após a execução. A seed também recusa um tenant que já possua membro ativo fora das três identidades de tenant previstas. Não use a seed com dados reais.

## BX.3 — Segurança e configuração

- definir contrato de variáveis para staging/produção e falha precoce para configuração insegura;
- preparar geração, rotação, revogação e recuperação de chaves JWT e peppers;
- revisar CORS, cookies, CSRF, headers, rate limit e Swagger; produção exige SMTP autenticado com TLS (`SMTP_REQUIRE_TLS=true`), sem aceitar o transporte local;
- definir redaction de logs, traces e payloads sensíveis;
- testar sessão, origem, tenant, role, CSRF e rate limit negativamente.

**Plataformas necessárias:** Railway temporário; Vercel temporário para validar origem e cookies.

**Encerrada em 30/08/2026:** o backend distingue `lab`, `staging` e `production`, permite e-mail explicitamente desabilitado apenas no laboratório, exige contrato de proxy em produção, rejeita Swagger público, defaults de pepper e identificadores JWT inválidos, aplica logging Pino como logger da aplicação, remove queries e segredos dos logs e oferece gerador em memória para par RSA/peppers. Os gates locais aprovaram 44 suítes/142 testes unitários e 33 suítes/92 testes PostgreSQL; a regressão de sessão posterior aprovou ainda 1 suíte/6 testes PostgreSQL. No Railway/Vercel foram comprovados readiness, rewrite `/api`, headers, CORS positivo e negativo, caminhos sem query, Swagger e sondas fechados, `401` controlado para refresh/logout sem sessão, `429` no rate limit e cookies `__Host-` seguros, persistentes durante a sessão e removidos no logout. O hotfix dessa prova está no commit `c388ad5`.

## BX.4 — Observabilidade, jobs e e-mail

- [x] integrar Sentry frontend/backend por variáveis configuráveis;
- [x] validar captura de `5xx`, descarte de `4xx` e ausência de PII, payloads e corpo de exceção; preservar somente metadados técnicos sanitizados e `requestId`;
- [x] configurar Better Stack para backend, frontend e readiness pelo rewrite Vercel → Railway;
- [x] comprovar alerta por e-mail no plano gratuito;
- [x] agendar backup diário Railway → R2 e comprovar heartbeat automático somente após dump, checksum, upload e verificação;
- [x] integrar OpenTelemetry como camada de instrumentação;
- [x] implantar o worker contínuo de processamento de eventos internos no Railway e comprovar conexão com PostgreSQL e efeito derivado de XP;
- [x] agendar limpeza de sessões e comprovar sua execução;
- [x] preparar e ensaiar o runbook de incidente;
- [ ] preparar integração Resend e testar sandbox/remetente fictício — bloqueado por domínio/e-mail corporativo;
- [ ] implementar e testar retry após 30 minutos, bounce e notificação ao admin do tenant — bloqueado pelo provedor real;
- [x] testar que token de convite não entra em logs, alertas ou interface no recorte já implementado;
- [ ] repetir as provas de token com transporte Resend e observabilidade de entrega quando o provedor estiver disponível.

**Plataformas necessárias:** Sentry, Better Stack, Resend e Railway temporários.

**Estado em 03/09/2026:** Sentry frontend/backend e Better Stack estão operacionais no laboratório. O Better Stack monitora backend direto, frontend e readiness pelo rewrite Vercel → Railway; o alerta do plano gratuito chega por e-mail. O heartbeat espera execução a cada 24 horas, aceita 5 horas de tolerância e abre incidente após 29 horas. Às 08:29 BRT de 01/09, o job agendado criou `disciplina-pro-20260901T112923Z.dump`, enviou dump e manifesto `.sha256`, confirmou ambos no R2 e terminou com `Backup concluído e verificado`. Como o script chama o heartbeat somente depois dessas verificações e antes da mensagem final, a execução comprova também a notificação automática ao Better Stack. O worker contínuo iniciou no Railway, manteve tráfego TCP com o PostgreSQL e processou evento com mudança observável de XP. Em 02/09, o serviço cron de limpeza de sessões concluiu sua primeira execução comprovada e a API exportou traces OTLP sanitizados para o Better Stack, incluindo spans HTTP e PostgreSQL. Em 03/09, um monitor temporário contra `/api/health/incident-drill` detectou `404`, abriu incidente, enviou alerta por e-mail e foi reconhecido às `20:54 BRT`; após apontá-lo para `/api/health/ready`, o Better Stack detectou a recuperação automaticamente e enviou a notificação correspondente. A readiness real permaneceu `200`, sem indisponibilidade. Resend, retry/bounce de convite e canal corporativo permanecem bloqueados pela ausência de e-mail/domínio corporativos. Telegram não é requisito do laboratório enquanto o plano disponível oferecer somente alerta por e-mail.

### OpenTelemetry — implementação local em 02/09/2026

- exportação de traces OTLP/HTTP habilitada somente por `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`;
- provider compartilhado com o SDK Sentry, sem segundo provider global;
- amostragem configurável por `OTEL_TRACES_SAMPLER_ARG`, com padrão de laboratório `0.1`;
- HTTPS obrigatório em produção e validação antecipada de endpoint/amostragem;
- sanitização de SQL, headers, corpos, credenciais, identificadores de usuário, IPs, exceções e query strings antes do envio;
- gates locais aprovados: testes focados, typecheck, lint e builds frontend/backend;
- operação e prova externa: [`OPERACAO_OBSERVABILIDADE.md`](OPERACAO_OBSERVABILIDADE.md).

### Evidência operacional do backup monitorado — 01/09/2026

- início do container Railway: `08:29:24` BRT;
- artefato UTC: `disciplina-pro-20260901T112923Z.dump` e respectivo `.sha256`;
- término verificado: `08:29:30` BRT;
- cadeia comprovada: agendamento Railway → `pg_dump` → upload de dois objetos → `head-object` de ambos → heartbeat HTTPS → log final de sucesso;
- interpretação: a ausência de novos dados de negócio não invalida o ensaio, pois cada execução gera um novo artefato timestampado;
- limite: a prova cobre backup lógico diário e detecção de ausência/falha do job, não PITR, RPO de 1 hora, restore Railway ou corte manual.

### Evidência operacional da limpeza de sessões — 02/09/2026

- serviço Railway isolado do worker contínuo e da API;
- build: `npm run prisma:generate && npm run build`;
- start command: `node backend/dist/src/cli/cleanup-sessions.js`;
- cron: `0 6 * * *` em UTC, equivalente a `03:00` BRT enquanto o fuso estiver em UTC−3;
- execução observada às `19:39` BRT: status `Completed` e log `Sessões expiradas revogadas: 0; sessões eliminadas: 0`;
- interpretação: zero alterações é sucesso idempotente quando não existem sessões elegíveis; o job conectou ao banco, executou a política e encerrou normalmente;
- política: revogar sessões vencidas e eliminar famílias revogadas há pelo menos 90 dias, sem remover auditoria nem imprimir tokens ou hashes.

## BX.5 — Qualidade, staging tests e operação

- [x] adaptar Playwright para URL externa sem reset destrutivo;
- [x] criar smoke tests para login, refresh, tenant, Projeto 66, tracker, ritual, administração e convite;
- [x] cobrir timeout, `401`, `403`, `409`, `429` e `5xx`;
- [x] executar axe em login, catálogo e visão geral do Projeto 66; validar os quatro viewports na visão geral do Projeto 66 em Chromium desktop/mobile;
- [x] executar Lighthouse desktop/mobile no login do build local;
- [x] medir o login externo com Lighthouse desktop/mobile e trace de carregamento;
- [x] validar a matriz de sessão, catálogo e acessibilidade nos motores Chromium, Firefox e WebKit (45 casos em duas execuções complementares);
- [ ] ampliar Lighthouse e performance às páginas autenticadas, repetir a prova externa após publicar as correções e validar dispositivos físicos/tecnologias assistivas;
- [x] preparar [DAST/pentest com contas e dados fictícios](PLANO_DAST_PENTEST.md), com matriz, procedimento, evidências e critérios de aceite; execução independente permanece pendente;
- [x] configurar gates de CI/CD para o candidato externo;
- [ ] concluir e ensaiar runbooks de deploy, migration, rollback, backup/restore, incidente, rotação de secrets e falha de e-mail;
- [x] criar [checklist de reprodução corporativa](CHECKLIST_REPRODUCAO_CORPORATIVA.md); execução futura permanece na BY.

**Plataformas necessárias:** Vercel, Railway, Sentry, Better Stack e GitHub/Sonar temporários.

**Evidência parcial da BX.5 em 03/09/2026:** o workflow do commit `226782b` concluiu com sucesso no [GitHub Actions](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33826943847). A instalação limpa passou a resolver o Playwright pelo workspace do frontend, executar `prisma generate` antes de migrations e build e evitar a auditoria duplicada do `npm ci`. O runner aprovou migrations, lint, typecheck, cobertura, 20 testes E2E backend, 23 execuções Playwright com 1 skip intencional, 93 integrações, builds, auditoria e análise SonarQube Cloud. O teste de tracker foi alinhado ao timezone `America/Bahia`, eliminando a tentativa de registrar uma data futura quando o runner UTC já estava no dia seguinte. Overrides compatíveis atualizaram `browserslist`, `deepmerge-ts`, `mysql2` e `qs`; o Dependabot confirmou zero alertas abertos. O disparo manual `workflow_dispatch` também ficou disponível para revalidações operacionais.

**Evidência do Playwright externo público em 04/09/2026:** uma configuração independente passou a aceitar somente `E2E_EXTERNAL_BASE_URL` em HTTPS, sem executar `globalSetup`, seed, reset de banco ou servidores locais. Contra `https://disciplina-pro-frontend.vercel.app`, as duas execuções do cenário público passaram em Chromium desktop e Pixel 7, validando a tela de login, o rewrite `/api/health/ready`, a API `ready` e o PostgreSQL `up`. O cenário é somente leitura e falha caso observe método HTTP mutável.

**Evidência do Playwright externo autenticado em 05/09/2026:** a suíte foi executada contra `https://disciplina-pro-frontend.vercel.app` com as identidades fictícias dedicadas de participante e CEO. As seis execuções passaram em `26,1 s`, cobrindo três cenários em Chromium desktop e mobile: login, contexto da sessão e tenant, refresh após reload, logout, Projeto 66, tracker, ritual, administração e convites. Somente login, refresh e logout realizaram mutações; não houve seed, reset do banco nem escrita de negócio. O procedimento, as garantias e os limites estão em `docs/OPERACAO_SMOKE_TEST_EXTERNO.md`.

**Evidência da matriz de resiliência em 05/09/2026:** uma suíte Playwright local intercepta exclusivamente `GET /api/programs` e simula timeout de transporte e respostas `401`, `403`, `409`, `429` e `503`, sem produzir falhas reais no candidato implantado. Em todos os casos, a interface encerra o loading, apresenta um alerta compreensível e recupera o catálogo real pela ação `Tentar novamente`; no `401`, a prova também exige a tentativa automática de refresh antes de expor a falha persistente. A matriz focada aprovou 12 execuções em desktop/mobile, e a suíte Playwright completa aprovou 35 execuções com 1 skip funcional intencional.

**Evidência de acessibilidade e responsividade em 05/09/2026:** a suíte `npm run test:e2e:a11y --workspace frontend` passou em 14 execuções Chromium desktop/mobile contra banco E2E descartável. Ela usa axe nos fluxos de login, catálogo autenticado e navegação do Projeto 66, rejeitando qualquer violação; também confirma ausência de overflow horizontal e alvos interativos com pelo menos 44px nos viewports `320×568`, `375×812`, `768×1024` e `1440×900`. A correção elevou o contraste de rótulos e textos secundários sem alterar as identidades visuais da Sala de Guerra e do Projeto 66. Lighthouse e a matriz em outros navegadores/dispositivos continuam necessários.

## Gate de saída BX

**Continuação em 05/09/2026:** Lighthouse `13.4.1` no login do build local registrou acessibilidade e boas práticas `100` em desktop/mobile, SEO `82` e Agentic Browsing `67`. O MCP não inclui nota de Performance; um trace separado, sem throttling, mediu LCP `64 ms` e CLS `0,01` localmente. A configuração `playwright.compatibility.config.js` acrescenta Firefox e WebKit: Chromium desktop/mobile e Firefox aprovaram 27 testes; os 18 casos WebKit não iniciaram por dependências ausentes no Fedora 44. Procedimento, achados, artefatos temporários e limites estão em [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md). WebKit, dispositivos físicos, validação assistiva e medição externa continuam pendentes.

BX encerra quando todo item possível sem contas corporativas estiver implementado e provado em laboratório, com configuração reproduzível documentada. BX não encerra PP de staging/produção nem libera dados reais.

**Reteste WebKit e prova externa em 05/09/2026:** o servidor oficial Playwright em Docker resolveu a incompatibilidade do Fedora; os 18 casos WebKit desktop/mobile passaram em `39,5 s`, completando os 45 casos da matriz com a execução anterior Chromium/Firefox. O workflow passa a instalar os três motores e executar a matriz adicional. O login externo ainda usa os assets anteriores às correções locais: acessibilidade Lighthouse `91`, boas práticas `100`, LCP observado `202 ms`, TTFB `51 ms` e CLS arredondado `0,00`, sem throttling e sem prova de cold cache. A nota externa de acessibilidade não foi encerrada: depende de deploy das correções e reteste. Foi preparado o checklist BY, cujos itens de execução continuam desmarcados.

**Auditoria autenticada e preparação de segurança em 05/09/2026:** snapshots Lighthouse no build local autenticado aprovaram catálogo desktop e visão geral do Projeto 66 em viewport móvel verificado, ambos com acessibilidade/boas práticas `100`. O trace local desktop do Projeto 66 registrou LCP `119 ms` e CLS `0,01`, sem throttling. O plano DAST/pentest foi preparado e seu baseline de sessão/CSRF/isolamento aprovou 17 testes existentes. A prova não cobre todas as telas autenticadas e não equivale à execução de scanner externo ou pentest independente.

## BY — Reprodução corporativa e staging oficial

Após criação do e-mail corporativo:

1. criar contas corporativas de Vercel, Railway, Cloudflare/R2, Sentry, Better Stack e Resend;
2. recriar recursos e gerar todos os secrets/tokens novamente;
3. configurar `staging.disciplinapro.com.br`, DNS, TLS, SPF, DKIM e DMARC;
4. repetir migration, seed fictício, PITR, backup/restore, alertas, e-mail e smoke tests;
5. registrar evidências e liberar staging privado para acessibilidade e pentest.
