# BX — Preparação pré-staging em laboratório

> Decisão operacional registrada em 23/08/2026. Esta fase não autoriza dados reais, domínio corporativo, billing corporativo nem considera staging oficial implantado.

**Estado em 30/08/2026:** BX.1, BX.2 e BX.3 concluídas no recorte de laboratório. O PITR Railway e o ensaio de recuperação dentro da infraestrutura Railway permanecem obrigatórios antes do lançamento, quando o plano contratado permitir.

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

**Risco residual transferido:** o dump diário comprovado não atende sozinho ao RPO de 1 hora. PITR/WAL, restore em serviço Railway novo, corte manual, monitoramento de falha do backup e aceite formal da evidência continuam no PP-007/B10.3 e bloqueiam produção, mas não bloqueiam o início da BX.3.

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

- integrar OpenTelemetry, Sentry frontend/backend e Better Stack por variáveis configuráveis;
- validar exceção sem PII, healthcheck, readiness, heartbeat e alerta para o Telegram privado;
- agendar processamento de eventos, limpeza de sessões, backup e retry de convite;
- preparar integração Resend e testar sandbox/remetente fictício;
- implementar e testar retry após 30 minutos, bounce e notificação ao admin do tenant;
- testar que token de convite não entra em logs, alertas ou interface.

**Plataformas necessárias:** Sentry, Better Stack, Resend e Railway temporários.

**Estado em 30/08/2026:** Sentry frontend/backend e Better Stack estão operacionais no laboratório. O Better Stack monitora backend direto, frontend e readiness pelo rewrite Vercel → Railway; o alerta por e-mail e o heartbeat manual foram aprovados. O heartbeat espera execução a cada 24 horas, aceita 5 horas de tolerância e abre incidente após 29 horas. O repositório passou a notificar o heartbeat somente depois de dump, checksum, upload e verificação no R2; falta implantar essa versão no serviço de backup e comprovar uma execução automática. OpenTelemetry, worker contínuo de eventos, limpeza agendada de sessões e runbook de incidente continuam executáveis; Resend, retry/bounce de convite e canal corporativo permanecem bloqueados pela ausência de e-mail/domínio corporativos.

## BX.5 — Qualidade, staging tests e operação

- adaptar Playwright para URL externa sem reset destrutivo;
- criar smoke tests para login, refresh, tenant, Projeto 66, tracker, ritual, administração e convite;
- cobrir timeout, 401, 403, 409, 429 e 5xx;
- executar axe, Lighthouse, viewports e matriz de dispositivo/navegador;
- preparar DAST/pentest com contas e dados fictícios;
- configurar gates de CI/CD e criar runbooks de deploy, migration, rollback, backup/restore, incidente, rotação de secrets e falha de e-mail;
- criar checklist de reprodução corporativa.

**Plataformas necessárias:** Vercel, Railway, Sentry, Better Stack e GitHub/Sonar temporários.

## Gate de saída BX

BX encerra quando todo item possível sem contas corporativas estiver implementado e provado em laboratório, com configuração reproduzível documentada. BX não encerra PP de staging/produção nem libera dados reais.

## BY — Reprodução corporativa e staging oficial

Após criação do e-mail corporativo:

1. criar contas corporativas de Vercel, Railway, Cloudflare/R2, Sentry, Better Stack e Resend;
2. recriar recursos e gerar todos os secrets/tokens novamente;
3. configurar `staging.disciplinapro.com.br`, DNS, TLS, SPF, DKIM e DMARC;
4. repetir migration, seed fictício, PITR, backup/restore, alertas, e-mail e smoke tests;
5. registrar evidências e liberar staging privado para acessibilidade e pentest.
