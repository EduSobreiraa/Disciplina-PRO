# ADR 014 — Execução, ciclos, fatos diários e privacidade

- Estado: aceita
- Data: 25/07/2026
- Fase: B5.0

## Contexto

A B4 entrega ofertas `AVAILABLE` sem fixar versão. A B5 precisa transformá-las em ciclos reproduzíveis, registrar execução sem persistir percentuais como fonte de verdade e substituir gradualmente os repositories locais do Projeto 66. Os ADRs 002, 004, 006 e 007 já fecharam calendário civil, efeitos de membership, versionamento e intervalos de pausa, mas faltam o início transacional, bloqueios simultâneos, fatos objetivos, privacidade e contratos HTTP.

Uma pausa pode decorrer ao mesmo tempo de solicitação do usuário, suspensão da membership e suspensão do tenant. Um único campo `source` perderia bloqueios ou permitiria retomada indevida. Conteúdo íntimo também não pode compartilhar DTOs, repositories ou consultas de reporting com fatos objetivos.

## Decisão

### Ownership e autorização

O módulo `execution` possui o lifecycle de `Enrollment`, pausas, fatos objetivos, respostas privadas e projeções individuais. `programs` continua proprietário do catálogo e da árvore publicada.

Este ADR detalha o ADR 007 e substitui apenas a representação de uma única `source` diretamente no intervalo: o intervalo continua único e imutável, enquanto suas origens passam a ser causas normalizadas para suportar bloqueios simultâneos.

- somente a membership proprietária lê e altera sua execução;
- `CEO` e `MANAGER` não recebem acesso individual adicional por sua role;
- reporting gerencial objetivo será uma fronteira separada na B7;
- `PlatformAccess` não ignora contexto de tenant nem acessa execução privada;
- toda operação revalida usuário, tenant, membership, enrollment e versão na transação.

### Lifecycle

```text
AVAILABLE → ACTIVE ↔ PAUSED
              ├────→ COMPLETED
              └────→ ABANDONED
PAUSED ─────────────→ ABANDONED
```

- `start` aceita somente `AVAILABLE`;
- `pause` aceita `ACTIVE`; repetir a mesma causa aberta é idempotente;
- `resume` só muda para `ACTIVE` quando nenhuma causa aberta permanece;
- `abandon` aceita `ACTIVE` ou `PAUSED`, resolve a pausa aberta e é terminal;
- `complete` aceita `ACTIVE` quando o dia calculado alcançou `durationDays`;
- completude de atividades não é pré-condição para conclusão temporal;
- ciclos terminais nunca são reciclados; outro ciclo usa nova linha e `cycleNumber` crescente;
- existe no máximo um enrollment `ACTIVE` ou `PAUSED` por membership e programa.

O início bloqueia enrollment e membership/programa. Na mesma transação, revalida tenant, usuário e membership ativos; exige `TenantProgram ENABLED`, `Program ACTIVE` e uma versão `PUBLISHED`; captura `Tenant.timeZone`; calcula `startedOn`; fixa versão, timezone e datas; muda para `ACTIVE` e audita somente identificadores. Publicação, arquivamento ou desabilitação posteriores não mudam o ciclo.

### Calendário e conclusão

Datas civis usam o timezone imutável do enrollment, por um serviço baseado em IANA. Nunca são calculadas dividindo milissegundos por 24 horas.

```text
elapsedActiveDays = diferença civil(today, startedOn)
                    - dias civis cobertos pelas pausas
programDay = clamp(elapsedActiveDays + 1, 1, durationDays)
```

O dia da solicitação de pausa continua consumido; `pauseStartsOn` é o dia civil seguinte e `resumedOn` volta a ser ativo. O intervalo congelado é `[pauseStartsOn, resumedOn)`.

Alcançar `durationDays` torna o ciclo elegível, mas uma consulta não altera estado. Um comando idempotente persiste `COMPLETED`; jobs futuros poderão chamar o mesmo caso de uso.

### Intervalos e causas de pausa

`EnrollmentPause` representa o intervalo único:

```text
id, enrollmentId, pausedAt, pauseStartsOn, resumedAt?, resumedOn?
```

`EnrollmentPauseCause` representa cada bloqueio:

```text
id, enrollmentPauseId
source                  USER | MEMBERSHIP | TENANT | PLATFORM
sourceReferenceId?
reason
createdAt, resolvedAt?
createdByMembershipId?, createdByPlatformAccessId?
resolvedByMembershipId?, resolvedByPlatformAccessId?
```

- existe no máximo um intervalo aberto por enrollment;
- existe no máximo uma causa aberta por `(enrollmentId, source, sourceReferenceId)`;
- uma nova causa reutiliza o intervalo aberto;
- resolver uma causa não encerra o intervalo enquanto houver outra aberta;
- intervalos encerrados e causas resolvidas são imutáveis;
- causas administrativas nunca são resolvidas automaticamente por reativação de tenant ou membership;
- retomada exige comando autorizado, ausência de causas e acesso efetivo válido;
- intervalos nunca se sobrepõem.

Suspender tenant, suspender/inativar membership e substituir CEO adiciona causa administrativa aos ciclos afetados na mesma transação organizacional. A integração é síncrona e idempotente.

### Fatos objetivos

`ActivityCompletion` registra:

```text
tenantId, enrollmentId, programVersionId, activityId
programDay, programDate, occurrenceKey, completedAt
```

`occurrenceKey` é derivada no servidor: `once`, `day:{programDay}` ou `week:{programWeek}`. O banco impõe `UNIQUE (enrollmentId, activityId, occurrenceKey)` e FKs compostas provam que atividade e enrollment usam a mesma versão.

`DailyRecord` registra `tenantId`, enrollment, `programDay`, `programDate` e `submittedAt`, com unicidade por `(enrollmentId, programDay)`.

`PillarScore` é detalhe genérico de `DailyRecord`, único por `(dailyRecordId, pillarKey)`. A chave e limites vêm da configuração publicada. Totais, progresso, adesão e streak são derivados.

Durante `PAUSED`, `COMPLETED` ou `ABANDONED`, novos fatos são rejeitados. Correção ou revogação futura será explícita e auditável.

### Conteúdo privado

`PrivateActivityResponse` usa tabela e repository próprios:

```text
tenantId, enrollmentId, programVersionId, activityId
programDay, programDate, payload, submittedAt, updatedAt
```

- FKs compostas mantêm resposta, atividade, versão, enrollment e tenant coerentes;
- somente a membership proprietária possui rotas de leitura e escrita;
- DTOs objetivos e repositories de reporting nunca dependem de `payload`;
- conteúdo privado nunca entra em auditoria, logs, eventos, XP ou projeções gerenciais;
- auditoria registra somente IDs e o fato de criação/substituição;
- retenção, exportação e criptografia de campo podem evoluir sem misturar fatos objetivos.

### Contratos HTTP

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

Todas exigem bearer e `X-Tenant-Id`. Tenant, membership, versão, dia e data nunca vêm do body. Pausa e abandono exigem motivo. Conteúdo privado só aparece nas rotas privadas explícitas.

### Concorrência obrigatória

- dois inícios fixam uma versão e um início;
- publicação concorrente com início resulta inteiramente na versão anterior ou nova;
- conclusões e registros repetidos não duplicam fatos;
- duas pausas abrem um intervalo;
- causas simultâneas não se sobrescrevem;
- resolver uma causa não retoma com outra aberta;
- abandono concorrente com escrita deixa uma ordem transacional válida;
- atividade de outra versão ou tenant é rejeitada.

### Erros públicos

| Situação | HTTP | Código |
|---|---:|---|
| enrollment não visível | 404 | `RESOURCE_NOT_FOUND` |
| payload ou motivo inválido | 400 | `INVALID_EXECUTION_DATA` |
| transição incompatível | 409 | `INVALID_ENROLLMENT_TRANSITION` |
| programa sem condição para início | 409 | `PROGRAM_START_NOT_ALLOWED` |
| pausa ou bloqueio administrativo | 409 | `EXECUTION_BLOCKED` |
| atividade não executável | 409 | `ACTIVITY_NOT_EXECUTABLE` |
| ciclo ainda não concluível | 409 | `ENROLLMENT_NOT_COMPLETABLE` |
| contexto empresarial inválido | 403 | códigos existentes |

## Decomposição

- **B5.0:** contrato, lifecycle, causas, fatos, privacidade, rotas e concorrência;
- **B5.1:** schema e migration com invariantes no PostgreSQL;
- **B5.2:** início, leitura, calendário, conclusão e abandono;
- **B5.3:** pausas, causas simultâneas e integração administrativa;
- **B5.4:** conclusões, registros, scores e respostas privadas;
- **B5.5:** adapters HTTP do Projeto 66, projeções e prova E2E.

## Consequências

- execução permanece genérica; 66 dias, pilares e rituais vêm da versão publicada;
- fatos permitem recalcular progresso, streak e adesão;
- bloqueios administrativos não perdem origem nem retomam silenciosamente;
- conteúdo íntimo fica fora de reporting, auditoria e eventos;
- B6 pode consumir eventos objetivos sem redesenhar a persistência principal.
