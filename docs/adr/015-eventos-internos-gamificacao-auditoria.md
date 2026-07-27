# ADR 015 — Eventos internos duráveis, gamificação e auditoria

- Estado: aceita
- Data: 26/07/2026
- Fase: B6.0

## Contexto

A B5 consolidou fatos objetivos de execução e separou conteúdo privado. A B6 precisa produzir XP, conquistas e auditoria sem acoplar essas consequências ao caso de uso principal e sem perder efeitos quando o processo cai entre o commit e a execução de um handler.

Eventos apenas em memória não atravessam reinícios. Executar handlers dentro da transação principal aumenta o acoplamento e faz uma indisponibilidade secundária rejeitar um fato válido. Também não é correto prometer entrega exatamente uma vez: retries, concorrência e falhas depois do commit podem repetir uma entrega.

O `AuditEvent` já existe desde a baseline e ações críticas são auditadas na mesma transação que as altera. Essa garantia não será enfraquecida. A gamificação, por outro lado, ainda usa um ledger em `localStorage` e precisa se tornar uma projeção server-side isolada por tenant.

## Decisão

### Modelo de consistência

O monolito adotará uma outbox transacional no próprio PostgreSQL:

```text
transação do domínio
  ├── grava o fato principal
  ├── preserva a auditoria crítica síncrona
  └── grava InternalEvent
commit
  ↓
processador entrega o evento pelo menos uma vez
  ├── gamification
  └── demais consumidores futuros
```

- o fato principal e seu `InternalEvent` são atômicos;
- consequências assíncronas são eventualmente consistentes;
- handlers rodam em transações curtas e independentes;
- falha de consequência não desfaz o fato principal;
- entrega é **at-least-once**; idempotência, e não uma promessa de exactly-once, impede duplicação;
- não haverá broker, fila externa ou microserviço no MVP.

Eventos gerados por uma repetição idempotente do comando de origem também não se repetem. A chave de origem será única e derivada do fato persistido, não de dados enviados pelo cliente.

### Envelope e entregas

`InternalEvent` será append-only e conterá:

```text
id, tenantId?, type, version
aggregateType, aggregateId
sourceKey
payload
occurredAt, createdAt
```

`sourceKey` identifica deterministicamente a ocorrência, por exemplo `activity-completion:{id}`. Haverá unicidade por `(type, sourceKey)`.

`InternalEventDelivery` manterá uma entrega por consumidor:

```text
eventId, consumer
status                 PENDING | PROCESSING | PROCESSED | FAILED
attempts, nextAttemptAt
lockedAt, lockedUntil
processedAt, lastErrorCode?
```

A unicidade `(eventId, consumer)` permite adicionar consumidores e reprocessar eventos sem misturar seus estados. Lotes concorrentes usam lock com `SKIP LOCKED` e lease expirada volta a ser elegível. Retry usa atraso limitado; depois do limite, a entrega fica `FAILED`, continua preservada e exige reprocessamento operacional explícito. Mensagens de exceção, stack traces e payloads não são persistidos como erro.

O processador poderá rodar periodicamente dentro do monolito e por um comando operacional idempotente. O endpoint que originou o fato não aguardará XP para responder.

### Catálogo inicial de eventos

A B6 começa somente com fatos objetivos necessários às regras existentes:

- `execution.activity-completion.recorded.v1`;
- `execution.daily-record.submitted.v1`;
- `execution.enrollment.completed.v1`.

O payload usa allowlist, versão explícita e somente identificadores, chaves objetivas, dia/data e instante necessários ao consumidor. Ele nunca contém resposta privada, motivo livre de pausa/abandono, e-mail, nome, token, texto digitado ou objeto HTTP.

Criar ou substituir `PrivateActivityResponse` não publica evento consumível por gamificação ou reporting.

### Ownership e contratos

- `execution` possui seus fatos e publica envelopes por uma porta de aplicação, sem importar Prisma ou regras de gamificação;
- `events` possui outbox, entregas, polling, retry e reprocessamento;
- `gamification` possui regras, ledger e conquistas;
- `audit` possui escrita padronizada e consultas autorizadas;
- consumidores dependem de contratos de evento versionados, não de tabelas privadas de outro módulo;
- controllers não coordenam handlers nem acessam Prisma.

### Gamificação

XP pertence à participação empresarial, portanto seu escopo canônico é `tenantId + membershipId`, mesmo que a entidade de conquista preserve o nome de produto `UserAchievement`.

`XpTransaction` é append-only:

```text
tenantId, membershipId
internalEventId, ruleKey
eventType, amount, description
occurredAt, createdAt
```

- `(internalEventId, ruleKey)` é único;
- saldo, nível e progresso são derivados do ledger;
- XP nunca é atualizado ou apagado;
- uma correção futura gera transação compensatória explícita;
- valores e regras ficam em código versionado, não no payload do evento;
- o frontend não decide nem envia quantidade de XP.

`UserAchievement` registra uma conquista por membership:

```text
tenantId, membershipId
achievementKey, sourceEventId
unlockedAt
```

`(membershipId, achievementKey)` é único. O handler calcula o estado a partir de fatos/ledger persistidos e pode ser repetido sem criar nova conquista.

A primeira migração cobrirá apenas regras sustentadas pelos fatos reais da B5: atividade concluída, registro diário/dia do programa, primeiro XP e patamares de XP. Regras do tracker, ritual e missões locais permanecem desativadas até seus fatos terem backend próprio; não serão simuladas no servidor.

### Auditoria

Auditoria de segurança e administração que hoje participa da transação principal continua síncrona. A outbox não será usada para criar uma janela em que uma alteração crítica exista sem seu registro de auditoria.

A B6 centralizará o contrato de escrita e implementará as leituras:

- pessoal: somente eventos objetivos visíveis à própria membership;
- time: `MANAGER` apenas nos times sob seu escopo; `CEO` em qualquer time do tenant;
- tenant: somente `CEO`;
- plataforma: fronteira separada para `PlatformAccess`.

Eventos de auditoria derivados de um `InternalEvent` terão referência única à origem. Repetir a entrega não duplica auditoria. `AuditEvent` permanece append-only durante sua vigência, com ator exclusivo e metadata por allowlist. Conteúdo privado e campos livres sensíveis não entram em ações, metadata, filtros ou respostas.

A política aprovada pela Spark em 26/07/2026 fixa retenção de 1 ano, salvo obrigação legal ou contratual diferente. O Desenvolvedor implementará o mecanismo; exceções dependem da política da Spark e de validação jurídica/contratual. Essa definição não antecipa a implementação da B10.2 nem autoriza apagar eventos fora do fluxo aprovado.

### Falhas, reprocessamento e observabilidade

- uma falha de handler incrementa tentativas e agenda retry sem marcar outros consumidores como falhos;
- processamento e consequência idempotente são confirmados na mesma transação;
- eventos desconhecidos ou com versão incompatível falham de forma explícita e não são descartados;
- o comando de reprocessamento aceita entrega/evento resolvido e registra auditoria operacional;
- métricas mínimas: pendentes, falhas, idade do evento mais antigo e tentativas;
- logs carregam IDs do evento, entrega, tenant e consumidor, nunca o payload completo.

### Concorrência e testes obrigatórios

- duas gravações concorrentes do mesmo fato criam um evento;
- dois processadores não produzem duas consequências;
- queda antes do commit não deixa evento órfão;
- queda depois de gravar XP e antes de confirmar entrega continua idempotente no retry;
- um consumidor falho não bloqueia outro;
- lease expirada é recuperável;
- evento de outro tenant não pode creditar nem ser consultado no tenant atual;
- payload privado não aparece em evento, XP, auditoria ou logs;
- reprocessar o mesmo evento não duplica XP, conquista ou auditoria.

## Decomposição

- **B6.0 — Contrato e planejamento:** consistência, envelope, ownership, privacidade, regras e gates.
- **B6.1 — Fundação persistente de eventos:** schema, migration, outbox, entregas, constraints append-only e testes PostgreSQL.
- **B6.2 — Publicação e processamento:** producers transacionais da execução, dispatcher, leases, retry e comando operacional.
- **B6.3 — Gamificação server-side:** ledger, regras iniciais, conquistas, projeção individual e API.
- **B6.4 — Módulo de auditoria:** contrato central, idempotência por evento e leituras pessoal/time/tenant com escopo.
- **B6.5 — Integração e prova E2E:** adapter HTTP do frontend, retirada do ledger local coberto pela fase e matriz de duplicação, falha, retry, privacidade e tenant.

## Consequências

- operações principais não dependem da disponibilidade de consequências;
- há novas tabelas e um processador operacional a monitorar;
- gamificação pode apresentar pequeno atraso após o fato;
- idempotência fica verificável por constraints e transações;
- a B7 poderá adicionar consumidores de reporting sem alterar producers existentes;
- regras sem fatos server-side permanecem deliberadamente fora da B6.
