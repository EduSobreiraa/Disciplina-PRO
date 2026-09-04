# Operação da outbox e recuperação

Este runbook cobre o pipeline `execução → InternalEvent → delivery → gamificação`. Ele não contém payloads, tokens ou credenciais.

## Serviços Railway

Crie um segundo serviço Railway a partir do mesmo repositório, sem domínio público, compartilhando `DATABASE_URL` e as variáveis da API por Reference Variables.

- API: diretório `backend`; start command `node dist/src/main.js`.
- Worker: diretório `backend`; start command `node dist/src/cli/run-internal-events-worker.js`.
- Build dos dois serviços: `npm run build`.

O worker é contínuo e é o mecanismo normal de produção. Ele processa lotes pelo caso de uso existente, usa leases e `SKIP LOCKED`, e aceita mais de uma réplica sem duplicar efeitos. Configure `OUTBOX_WORKER_POLL_INTERVAL_MS=1000` e `OUTBOX_WORKER_ERROR_DELAY_MS=5000` inicialmente. Use `node` diretamente no comando Railway para que `SIGTERM` alcance o worker e o encerramento seja gracioso.

**Estado em 01/09/2026:** o serviço worker contínuo está implantado no Railway com `OUTBOX_WORKER_POLL_INTERVAL_MS=1000`, conexão recorrente com o PostgreSQL e processamento de evento com alteração de XP comprovados. As instruções abaixo permanecem como operação e recuperação do serviço ativo.

O comando abaixo continua disponível apenas como contingência manual:

```bash
npm run events:process --workspace backend
```

## Inspecionar a outbox

Com um access token de `PlatformAccess`, consulte:

```text
GET /api/platform/operations/outbox/metrics
Authorization: Bearer <token>
```

A resposta não expõe payloads e contém `pending`, `processing`, `expiredProcessing`, `failed`, `openDeliveries`, `oldestPendingOccurredAt`, `oldestPendingAgeSeconds` e `maximumAttempts`.

Interpretação:

- `failed > 0`: intervenção obrigatória;
- `expiredProcessing > 0`: verificar worker, banco e lease; o próximo worker pode recuperar a delivery;
- `oldestPendingAgeSeconds` crescente: não há progresso;
- `maximumAttempts` alto: investigar erro antes de reprocessar.

## Delivery FAILED

1. Consulte as métricas e os logs estruturados usando `deliveryId`, `eventId`, `tenantId` e `consumer`.
2. Corrija ou elimine a causa externa; não reprocese falha determinística sem correção.
3. Reabra exclusivamente a delivery falha:

```bash
npm run events:reprocess --workspace backend -- <uuid-da-entrega>
```

4. Execute o worker normalmente — ou, em contingência, `npm run events:process --workspace backend`.
5. Confirme `failed` reduzido, delivery `PROCESSED` no banco e o efeito derivado esperado, por exemplo XP/conquista.

O reprocessamento é auditado. Não altere tabelas de outbox manualmente.

## Backlog parado ou deploy/restart

1. Verifique se o serviço worker está `Active` e se seu comando é `node dist/src/cli/run-internal-events-worker.js`.
2. Consulte `/api/platform/operations/outbox/metrics` e os logs do worker.
3. Se houver falha de banco, mantenha o worker ativo: ele tenta reconectar; deliveries em processamento voltam a ficar elegíveis ao expirar a lease.
4. Após deploy/restart, confirme que `pending` cai. Os eventos persistem no PostgreSQL; restart não os descarta.
5. Investigue `FAILED` antes de reprocessar. Não use reprocessamento em massa como primeira ação.

## Alertas a configurar

| Sinal | Severidade | Limiar inicial | Destino futuro |
|---|---|---|---|
| `failed` | crítico | `> 0` por 5 min | Better Stack → Telegram/e-mail |
| erro contínuo de conexão do worker | crítico | 3 ciclos consecutivos | Better Stack + Sentry |
| `oldestPendingAgeSeconds` crescente | crítico | > 10 min por 10 min | Better Stack |
| `pending` | warning | > 100 por 10 min | Better Stack |
| `maximumAttempts` | warning | >= 3 | Better Stack/Sentry |
| `expiredProcessing` | warning | > 0 por 2 min | Better Stack |

No laboratório, Sentry e Better Stack possuem contas, credenciais e monitores ativos, o worker está implantado e a API exporta traces OpenTelemetry sanitizados. Alertas específicos da outbox e seus limiares ainda precisam ser ensaiados. Até essa prova específica, o endpoint de métricas, os logs estruturados, os traces e o estado do serviço worker no Railway são os sinais autoritativos da outbox.

## Backup PostgreSQL para R2

O diretório `ops/backup/` fornece uma imagem de cron Railway com `pg_dump`, `pg_restore` e AWS CLI. Configure o serviço de backup com Dockerfile `ops/backup/Dockerfile` e contexto de build na raiz do repositório. Variáveis necessárias:

```text
DATABASE_URL
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=<bucket>
R2_PREFIX=disciplina-pro/postgres
AWS_ACCESS_KEY_ID=<R2 access key>
AWS_SECRET_ACCESS_KEY=<R2 secret>
AWS_REGION=auto
BACKUP_HEARTBEAT_URL=<URL HTTPS secreta do heartbeat Better Stack>
```

O job falha se o dump, upload, verificação ou notificação do heartbeat falhar. Ele confirma ambos os objetos com `head-object`, envia um manifesto `<dump>.sha256` e só então chama `BACKUP_HEARTBEAT_URL`; assim, uma falha anterior nunca produz sinal falso de sucesso. A URL é secret do serviço de backup e não deve aparecer no Git ou nos logs. Agende ao menos uma cópia completa diária, por exemplo `0 2 * * *` UTC. No laboratório, o heartbeat é esperado a cada 24 horas, com 5 horas de tolerância e alerta por e-mail após 29 horas. A retenção de 90 dias deve ser aplicada por lifecycle rule no bucket, não pelo script.

O backup diário em R2 não cumpre sozinho o RPO de 1 hora. Antes de produção, habilite PITR/WAL no PostgreSQL Railway e execute um drill que registre idade do backup e tempo de restauração.

## Restore drill

Nunca faça restore sobre produção. Crie um banco Railway descartável e use somente URL dele.

```bash
export RESTORE_TARGET_ENVIRONMENT=drill
export RESTORE_CONFIRM=RESTORE_DISCARDABLE_DATABASE
export RESTORE_DATABASE_URL='postgresql://.../disciplina_pro_restore'
export RESTORE_EXPECTED_DATABASE_NAME=disciplina_pro_restore
export R2_BACKUP_KEY='disciplina-pro/postgres/disciplina-pro-20260822T020000Z.dump'
./ops/backup/restore-postgres-from-r2.sh
```

O script recusa `production`, exige confirmação literal e o nome exato do banco de destino, baixa o artefato e o manifesto `<dump>.sha256`, valida a integridade antes de executar `pg_restore --clean --if-exists` e confirma as tabelas `internal_events` e `_prisma_migrations`. Use `R2_BACKUP_CHECKSUM_KEY` somente se a chave do manifesto não seguir o padrão padrão `<R2_BACKUP_KEY>.sha256`. Em seguida execute `DATABASE_URL="$RESTORE_DATABASE_URL" npm run prisma:migrate:status --workspace backend`, consulte `/api/health/ready` contra o ambiente restaurado e rode smoke tests de login, execução, gamificação e métricas de outbox.

Registre duração do restore e idade do backup: ambos são a evidência para RTO de 4 horas e RPO de 1 hora.

### Evidência de laboratório — 30/08/2026

- artefato: `disciplina-pro-20260830T142746Z.dump` e manifesto `disciplina-pro-20260830T142746Z.dump.sha256`;
- SHA-256 validado: `0bc189d1e6c9d4a73b6462aeeec09ac8fcf793bdf6d72dd4e0fc51b4124f5987`;
- origem: job Railway PostgreSQL → bucket R2 privado, com execução diária e Lifecycle Rule de 90 dias;
- destino: container descartável `postgres:18`, escolhido porque o arquivo custom possui formato de archive `v1.16` gerado pelo PostgreSQL 18;
- restore: `pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error`, concluído com código zero em menos de 1 segundo;
- validação: 33 tabelas públicas, schema mínimo `internal_events` + `_prisma_migrations` íntegro, 11 migrations, 4 usuários fictícios, 1 tenant, 3 memberships, 3 enrollments e 30 comportamentos;
- descarte: container e banco temporários removidos após a conferência; artefato e manifesto permaneceram disponíveis para auditoria local.

O ensaio comprova PostgreSQL → dump → R2 → verificação de checksum → restore → dados recuperáveis. Ele encerra o recorte de backup lógico da BX.2, mas não comprova PITR nem o RPO de 1 hora. Antes do lançamento, repetir o restore em infraestrutura Railway descartável e ensaiar PITR/corte manual.

### Evidência de execução automática monitorada — 01/09/2026

- o scheduler do Railway iniciou o container às `08:29:24` BRT;
- o job criou `disciplina-pro-20260901T112923Z.dump` (`11:29:23Z`), enviou o dump e o manifesto `.sha256` ao prefixo configurado e encerrou às `08:29:30` BRT;
- a mensagem `Backup concluído e verificado` só é emitida depois de `head-object` confirmar os dois objetos e de `curl --fail` notificar `BACKUP_HEARTBEAT_URL`;
- portanto, o log final comprova uma execução automática completa e um heartbeat aceito, sem produzir falso sucesso quando dump, checksum, upload, verificação ou notificação falham;
- o monitor Better Stack permanece configurado para periodicidade de 24 horas, tolerância de 5 horas e alerta por e-mail após 29 horas sem heartbeat;
- a execução é válida mesmo sem mudança nos dados de negócio: o arquivo é um novo snapshot timestampado, enquanto o conteúdo lógico recuperável pode permanecer equivalente ao anterior.

Essa evidência encerra no laboratório a pendência de implantação/prova do heartbeat automático. PITR, restauração dentro do Railway, corte manual e ensaio de falha de migration continuam no PP-007/B10.3.

## Rollback e forward-fix

- Faça rollback somente da aplicação quando a migration for compatível e o schema continuar atendendo à versão anterior.
- Se migration já foi aplicada e a versão anterior não é compatível, aplique forward-fix; não faça rollback de dados como rotina.
- Migration destrutiva exige plano específico, backup verificado e drill antes do deploy.
- Restore de banco é último recurso para corrupção ou perda de dados, nunca o mecanismo normal de rollback.
