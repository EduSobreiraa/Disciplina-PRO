# BX — Preparação pré-staging em laboratório

> Decisão operacional registrada em 23/08/2026. Esta fase não autoriza dados reais, domínio corporativo, billing corporativo nem considera staging oficial implantado.

**Estado em 06/09/2026:** BX encerrada no recorte de laboratório. BX.1–BX.3 foram concluídas; BX.4 comprovou observabilidade, jobs, backup monitorado, incidente e o ciclo seguro de convite Resend; BX.5 comprovou CI/CD, smokes externos, matriz automatizada das 17 rotas autenticadas e os runbooks de release e recuperação. O [CI 34034229898](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/34034229898) do último candidato de código concluiu com Quality Gate e verificação de zero issues Sonar abertas no código novo. Permanecem formalmente transferidos para a BY/staging oficial o PITR e restore dentro da Railway, bounce/entregabilidade com domínio corporativo, validação assistiva humana, DAST/pentest independente e a reprodução em contas corporativas. Nenhum desses itens autoriza dados reais antes dos gates próprios.

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
- [x] comprovar envio básico pela API Resend com `onboarding@resend.dev` ao endereço de teste autorizado: HTTP 200 e recebimento confirmado pelo titular, na pasta spam;
- [x] implementar transporte Resend no backend com seleção explícita, template compartilhado, limite de espera, idempotência e destinatário restrito no laboratório; validar ciclo de convites com HTTP Resend simulado;
- [x] repetir o ciclo completo contra a API real do Resend e registrar eventos de entrega — convite enviado, eventos `SENT`/`DELIVERED` persistidos e aceite confirmado pelo titular no laboratório;
- [x] publicar API/worker, aplicar migrações após backup verificado, cadastrar webhook assinado e comprovar envio de convite ao Gmail autorizado com eventos reais `SENT`/`DELIVERED` persistidos no laboratório (noite de 05/09/2026); aceite pelo titular confirmado;
- [x] validar falhas SMTP simuladas, rejeição de destinatário, limites de espera e envio real ao Mailpit local, sem exposição de segredos nos logs (05/09/2026);
- [x] implementar localmente retry durável único após 30 minutos para falhas temporárias elegíveis, com rotação do token mantendo somente hashes, cancelamento de jobs obsoletos e revisão de resultados ambíguos;
- [x] implementar localmente aviso persistido no painel de convites e envio ao administrador, com claim atômico, restrição de destinatário no laboratório e proteção contra avisos repetidos;
- [x] ensaiar o worker já publicado de retry e avisos com falhas controladas: falha temporária controlada esgotou uma única tentativa após 30 minutos (`REVIEW`/`EXHAUSTED`) e gerou aviso real único ao CEO, recebido pelo titular no spam; não equivale a retry entregue com sucesso pelo Resend;
- [x] delimitar a prova de bounce/entregabilidade real para o staging oficial: o receptor autenticado, a deduplicação, a chegada fora de ordem e as falhas controladas foram comprovados no laboratório; rejeição real e reputação dependem do domínio/remetente corporativo;
- [x] implementar receptor local de webhook assinado, eventos duráveis deduplicados, associação após resposta de envio e bloqueio por rejeição permanente/reclamação/supressão; migration aditiva aplicada somente ao banco de testes. Detalhes e limites em [Operação Resend](OPERACAO_EMAIL_RESEND.md).
- [x] testar que token de convite não entra em logs, alertas ou interface no recorte já implementado;
- [x] repetir as provas de não exposição do token com transporte Resend e observabilidade: envio, webhooks e aceite reais preservaram o token fora de logs, eventos de entrega, alertas e interface.

**Plataformas necessárias:** Sentry, Better Stack, Resend e Railway temporários.

**Publicação e envio real — noite de 05/09/2026:** candidato de e-mail `5daf515` publicado sem as mudanças locais de tracker/missões. Migrações aplicadas no laboratório após backup adicional verificado no R2; API ganhou pre-deploy de migração com timeout de 300s. Webhook externo cadastrado e segredo mantido no Railway. O CI inicial encontrou corrida no teste preexistente de timeout do catálogo; correção apenas no teste em `2569ab0` passou 10 repetições locais e o [CI completo 33999858491](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33999858491), além dos 8 smokes externos. Depois do gate verde, API e worker foram habilitados exclusivamente para o Gmail autorizado. Um convite real foi aceito pelo Resend, seus eventos `SENT`/`DELIVERED` chegaram por webhook e o aceite foi confirmado pelo titular. Na continuação do ensaio, o worker processou falhas controladas, retry esgotado e avisos administrativos recebidos. Evidências, IDs e rollback em [Operação Resend](OPERACAO_EMAIL_RESEND.md#publicação-no-laboratório--05092026).

**Registro do candidato local anterior à publicação — 05/09/2026:** webhook assinado, retry durável e aviso administrativo no painel/por e-mail foram inicialmente validados em 26 casos de integração, 34 testes unitários de transporte, 8 E2E de ciclo de convites e 10 execuções de navegador desktop/mobile. Esse estado foi superado pela publicação e pelas provas externas registradas acima. O aviso usa o CEO ativo do tenant (administrador criador da plataforma no convite inicial), não redireciona endereços fora da lista de laboratório e não repete automaticamente resultados incertos. Limites e rollback em [Operação Resend](OPERACAO_EMAIL_RESEND.md#avisos-administrativos--candidato-local-05092026).

**Integração Resend — registro histórico do candidato local em 05/09/2026:** antes da publicação, o adaptador de convites foi validado com 36 testes de configuração/transporte/template e 8 casos E2E de ciclo. A chave no `.env` sozinha não habilita envio: é necessário selecionar `INVITATION_EMAIL_PROVIDER=resend`, habilitar `SMTP_DELIVERY_ENABLED=true`, definir `RESEND_FROM` e, em local/lab, um único `RESEND_TEST_RECIPIENT`. O modo padrão continua SMTP/Mailpit. A configuração oficial rejeita remetente `@resend.dev`; o template mantém o token somente no fragmento e respostas/exceções do provedor não são registradas. A publicação posterior está descrita acima.

**Decisão de retry aprovada em 05/09/2026:** seguindo a [orientação do Resend](https://resend.com/docs/dashboard/emails/send-test-emails), aplicar retry único após 30 minutos somente em falhas temporárias elegíveis; rejeições permanentes/reclamações interrompem envios ao destinatário e notificam o administrador sem novo envio. Acompanhar entrega por webhook assinado, sem polling de status à API do provedor; não duplicar uma entrega ainda em processamento pelo Resend. O receptor, a fila durável e a notificação foram implementados e comprovados posteriormente no laboratório, conforme os registros de publicação acima.

**Prova SMTP local em 05/09/2026:** 19 testes focados de convites e 1 teste SMTP real no Mailpit aprovados; lint, tipagem e build backend aprovados. Conexão/saudação têm timeout de 10 segundos e inatividade de socket de 30 segundos (não é prazo total de envio). `SENT` significa aceitação SMTP, não chegada à caixa postal. Rejeição ou ausência de destinatário aceito retorna `FAILED`; os logs preservam apenas o identificador do convite. Retry automático, bounce real e notificação administrativa ainda não estão implementados nesta etapa.

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
- [x] publicar as correções de contraste e repetir Lighthouse e smoke público externo em desktop/mobile (candidato `b775bed`);
- [x] repetir o smoke autenticado externo do candidato `b775bed` em desktop/mobile: 6 testes aprovados em 22,9 s;
- [x] ampliar a auditoria automatizada de acessibilidade/responsividade e as medições de carregamento às 17 rotas autenticadas, localmente e no build externo desktop/mobile; correções publicadas em `3a9457c`, 34 testes locais e 6 grupos externos aprovados. Lighthouse complementar nas três telas com contraste corrigido. Escopo e limites em [Validação ampliada frontend](VALIDACAO_FRONTEND_2026-09-06.md);
- [x] encerrar o escopo automatizado de pré-staging com auditoria das 17 rotas, Lighthouse complementar nas telas corrigidas e métricas externas de carregamento; tecnologias assistivas reais e INP com interação humana ficam transferidos para a BY. Testes em aparelhos físicos não são gate de staging, conforme decisão operacional de 05/09/2026;
- [x] corrigir localmente as listas inválidas no tracker e o contraste no ritual: regressões reproduzidas antes da correção; 18 testes de acessibilidade/responsividade aprovados após a correção, em 42,7 s. Detalhes e escopo em [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md#correções-locais-dos-dois-achados).
- [x] publicar e retestar externamente as correções de listas/contraste: candidato `8802a6e`; axe de página inteira sem violações nas quatro combinações tracker/ritual desktop/mobile, sem escrita de negócio.
- [x] revalidar o candidato `8802a6e`: seis smokes autenticados externos aprovados em 23,2 s e [CI completo](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33991042818) aprovado em 7min45s, incluindo Firefox/WebKit e SonarQube Cloud.
- [x] investigar os deslocamentos do tracker: remoção do loading deslocava o conteúdo 72px e a inserção das linhas expandia a tabela. Corrigido localmente com estado de carregamento separado das projeções; regressão da transição aprovada.
- [x] resolver localmente `scrollable-region-focusable` da tabela sem comportamentos: região nomeada e focável, contorno visível, axe de página inteira e Tab/ArrowRight aprovados em desktop/mobile.
- [x] publicar e retestar externamente foco e carregamento do tracker: candidato `ffb8528`; axe sem violações em quatro combinações (desktop/mobile, com dados/vazio), Tab/ArrowRight funcionando sem alterar DOM, sem repetição do salto dos blocos do tracker na transição controlada. Seis smokes autenticados aprovados em 21,5 s. Detalhes e limites da medição em [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md#publicação-e-reteste-externo--ffb8528).
- [x] confirmar CI do candidato `ffb8528`: [execução 33991784831](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33991784831) aprovada em 9min27s, incluindo regressões Firefox/WebKit e SonarQube Cloud.
- [x] preparar [DAST/pentest com contas e dados fictícios](PLANO_DAST_PENTEST.md), com matriz, procedimento, evidências e critérios de aceite; execução independente permanece pendente;
- [x] configurar gates de CI/CD para o candidato externo;
- [x] concluir e ensaiar runbooks de deploy, migration, rollback, backup/restore, incidente, rotação de secrets e falha de e-mail; evidências e limites em [Runbook de release e recuperação](OPERACAO_RELEASE_LAB.md) (06/09/2026);
- [x] criar [checklist de reprodução corporativa](CHECKLIST_REPRODUCAO_CORPORATIVA.md); execução futura permanece na BY.

**Plataformas necessárias:** Vercel, Railway, Sentry, Better Stack e GitHub/Sonar temporários.

**Evidência parcial da BX.5 em 03/09/2026:** o workflow do commit `226782b` concluiu com sucesso no [GitHub Actions](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33826943847). A instalação limpa passou a resolver o Playwright pelo workspace do frontend, executar `prisma generate` antes de migrations e build e evitar a auditoria duplicada do `npm ci`. O runner aprovou migrations, lint, typecheck, cobertura, 20 testes E2E backend, 23 execuções Playwright com 1 skip intencional, 93 integrações, builds, auditoria e análise SonarQube Cloud. O teste de tracker foi alinhado ao timezone `America/Bahia`, eliminando a tentativa de registrar uma data futura quando o runner UTC já estava no dia seguinte. Overrides compatíveis atualizaram `browserslist`, `deepmerge-ts`, `mysql2` e `qs`; o Dependabot confirmou zero alertas abertos. O disparo manual `workflow_dispatch` também ficou disponível para revalidações operacionais.

**Evidência do Playwright externo público em 04/09/2026:** uma configuração independente passou a aceitar somente `E2E_EXTERNAL_BASE_URL` em HTTPS, sem executar `globalSetup`, seed, reset de banco ou servidores locais. Contra `https://disciplina-pro-frontend.vercel.app`, as duas execuções do cenário público passaram em Chromium desktop e Pixel 7, validando a tela de login, o rewrite `/api/health/ready`, a API `ready` e o PostgreSQL `up`. O cenário é somente leitura e falha caso observe método HTTP mutável.

**Evidência do Playwright externo autenticado em 05/09/2026:** a suíte foi executada contra `https://disciplina-pro-frontend.vercel.app` com as identidades fictícias dedicadas de participante e CEO. As seis execuções passaram em `26,1 s`, cobrindo três cenários em Chromium desktop e mobile: login, contexto da sessão e tenant, refresh após reload, logout, Projeto 66, tracker, ritual, administração e convites. Somente login, refresh e logout realizaram mutações; não houve seed, reset do banco nem escrita de negócio. O procedimento, as garantias e os limites estão em `docs/OPERACAO_SMOKE_TEST_EXTERNO.md`.

**Evidência da matriz de resiliência em 05/09/2026:** uma suíte Playwright local intercepta exclusivamente `GET /api/programs` e simula timeout de transporte e respostas `401`, `403`, `409`, `429` e `503`, sem produzir falhas reais no candidato implantado. Em todos os casos, a interface encerra o loading, apresenta um alerta compreensível e recupera o catálogo real pela ação `Tentar novamente`; no `401`, a prova também exige a tentativa automática de refresh antes de expor a falha persistente. A matriz focada aprovou 12 execuções em desktop/mobile, e a suíte Playwright completa aprovou 35 execuções com 1 skip funcional intencional.

**Evidência de acessibilidade e responsividade em 05/09/2026:** a suíte `npm run test:e2e:a11y --workspace frontend` passou em 14 execuções Chromium desktop/mobile contra banco E2E descartável. Ela usa axe nos fluxos de login, catálogo autenticado e navegação do Projeto 66, rejeitando qualquer violação; também confirma ausência de overflow horizontal e alvos interativos com pelo menos 44px nos viewports `320×568`, `375×812`, `768×1024` e `1440×900`. A correção elevou o contraste de rótulos e textos secundários sem alterar as identidades visuais da Sala de Guerra e do Projeto 66. Lighthouse e a matriz em outros navegadores/dispositivos continuam necessários.

## Gate de saída BX

**Continuação em 05/09/2026:** Lighthouse `13.4.1` no login do build local registrou acessibilidade e boas práticas `100` em desktop/mobile, SEO `82` e Agentic Browsing `67`. O MCP não inclui nota de Performance; um trace separado, sem throttling, mediu LCP `64 ms` e CLS `0,01` localmente. A configuração `playwright.compatibility.config.js` acrescenta Firefox e WebKit: Chromium desktop/mobile e Firefox aprovaram 27 testes; os 18 casos WebKit não iniciaram por dependências ausentes no Fedora 44. Procedimento, achados, artefatos temporários e limites estão em [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md). Validação assistiva e medição externa continuam pendentes; testes em aparelhos físicos não são gate de staging.

BX encerra quando todo item possível sem contas corporativas estiver implementado e provado em laboratório, com configuração reproduzível documentada. BX não encerra PP de staging/produção nem libera dados reais.

**Reteste WebKit e prova externa em 05/09/2026:** o servidor oficial Playwright em Docker resolveu a incompatibilidade do Fedora; os 18 casos WebKit desktop/mobile passaram em `39,5 s`, completando os 45 casos da matriz com a execução anterior Chromium/Firefox. O workflow passa a instalar os três motores e executar a matriz adicional. O login externo ainda usa os assets anteriores às correções locais: acessibilidade Lighthouse `91`, boas práticas `100`, LCP observado `202 ms`, TTFB `51 ms` e CLS arredondado `0,00`, sem throttling e sem prova de cold cache. A nota externa de acessibilidade não foi encerrada: depende de deploy das correções e reteste. Foi preparado o checklist BY, cujos itens de execução continuam desmarcados.

**Auditoria autenticada e preparação de segurança em 05/09/2026:** snapshots Lighthouse no build local autenticado aprovaram catálogo desktop e visão geral do Projeto 66 em viewport móvel verificado, ambos com acessibilidade/boas práticas `100`. O trace local desktop do Projeto 66 registrou LCP `119 ms` e CLS `0,01`, sem throttling. O plano DAST/pentest foi preparado e seu baseline de sessão/CSRF/isolamento aprovou 17 testes existentes. A prova não cobre todas as telas autenticadas e não equivale à execução de scanner externo ou pentest independente.

**Reteste público do candidato `b775bed` em 05/09/2026:** deploy Vercel confirmado; login externo com acessibilidade/boas práticas Lighthouse 100 em desktop e mobile, e smoke público com 2 testes aprovados em 4,3 s. Trace sem throttling: LCP 229 ms, TTFB 34 ms e CLS 0,01. Evidências e limites em [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md#reteste-após-publicação-de-b775bed). O reteste autenticado exige disponibilizar as credenciais fictícias no ambiente local; nenhuma senha foi alterada para realizar esta prova.

**CI do candidato `b775bed`:** [execução 33989734961](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33989734961) concluída com sucesso em 9min14s, incluindo a nova matriz Firefox/WebKit e SonarQube Cloud. A publicação e a prova pública corrigida estão encerradas neste recorte; os demais itens desmarcados da BX permanecem abertos.

**Gate BX encerrado em 06/09/2026.** Os registros anteriores preservam a evolução de cada prova; seus apontamentos pendentes foram resolvidos ou transferidos para a BY conforme o estado no início deste documento. O candidato de código `e4d9a41` passou pelo [CI 34034229898](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/34034229898), incluindo Quality Gate e zero issues Sonar abertas no código novo. A matriz de qualidade das 17 rotas, os smokes externos, o ensaio operacional e os runbooks estão registrados nos documentos vinculados. PITR/restore Railway, contas e segredos corporativos, domínio/DNS/DKIM/DMARC, bounce/entregabilidade real, validação assistiva e DAST/pentest independente pertencem ao checklist BY e continuam bloqueando qualquer promoção com dados reais.

## BY — Reprodução corporativa e staging oficial

Antes da transição, o reteste autenticado do candidato `b775bed` foi concluído em 05/09/2026: **6 testes aprovados em 22,9 s**, desktop/mobile, sem escrita de negócio. A credencial fictícia foi disponibilizada no `.env` local e carregada sem exposição; traces desativados. Isso resolve a dependência de credencial para o smoke mencionada no registro anterior, mas não encerra Lighthouse/performance autenticados ou tecnologias assistivas. Testes em aparelhos físicos não são gate de staging. Procedimento e evidência em [Smoke externo](OPERACAO_SMOKE_TEST_EXTERNO.md#reteste-do-candidato-b775bed--05092026).

### Diretriz de lançamento MVP controlado — 07/09/2026

O primeiro lançamento busca aprendizado com usuários reais, não antecipar toda a operação de escala. A beta só abre após prova de fluxo principal, backup/restore, segurança focada e observabilidade com responsável operacional; deve começar com grupo limitado, suporte definido e capacidade de pausar novos cadastros. Envio básico de convite/webhook precisa estar operacional; retry entregue, bounce e automações avançadas podem evoluir após o início, com risco conhecido registrado.

O runner de migrations não é serviço de uso diário: removê-lo após a reprodução bem-sucedida libera capacidade para backup e ele deve ser recriado pelo runbook somente antes de um deploy que contenha migration versionada. Alterações de frontend ou lógica sem mudança de schema não exigem esse runner.

PITR e RPO de uma hora continuam o objetivo de produção plena. Caso a beta seja aberta antes desse ensaio, documentar o RPO efetivo, a limitação de participantes, responsável pelo aceite e critérios de interrupção; não promover essa exceção a conclusão dos gates B10/produção.

Após criação do e-mail corporativo:

1. criar contas corporativas de Vercel, Railway, Cloudflare/R2, Sentry, Better Stack e Resend;
2. recriar recursos e gerar todos os secrets/tokens novamente;
3. configurar `staging.disciplinapro.com.br`, DNS, TLS, SPF, DKIM e DMARC;
4. repetir migration, seed fictício, PITR, backup/restore, alertas, e-mail e smoke tests;
5. registrar evidências e liberar staging privado para acessibilidade e pentest.
