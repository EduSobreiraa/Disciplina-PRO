# ADR 007 — Intervalos de pausa do enrollment

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O estado `PAUSED` indica bloqueio atual, mas não permite reproduzir quantos dias foram congelados. O Projeto 66 usa dias civis no timezone capturado pelo enrollment, portanto pausas não podem ser calculadas por blocos de 24 horas nem sobrescrever o histórico.

## Decisão

Cada pausa gera um `EnrollmentPause` imutável após seu encerramento, com:

```text
enrollmentId
pausedAt
pauseStartsOn
resumedAt
resumedOn
source
reason
createdByMembershipId
createdByPlatformAccessId
```

`pausedAt` e `resumedAt` são instantes UTC. `pauseStartsOn` e `resumedOn` são datas civis no `Enrollment.timeZone`. `source` distingue `USER`, `MEMBERSHIP`, `TENANT` e `PLATFORM`; exatamente um ator humano é registrado quando aplicável.

Somente dias civis completos são descontados. Uma pausa solicitada na data local D bloqueia operações imediatamente, mas começa a congelar o calendário em D + 1. A retomada na data R torna R um dia ativo. Portanto, o intervalo descontado é `[pauseStartsOn, resumedOn)`.

Exemplo: pausa solicitada no dia 10, com `pauseStartsOn` no dia 11, e retomada no dia 14 desconta os dias 11, 12 e 13. Pausar e retomar antes da próxima data civil desconta zero dias.

O dia corrente é calculado por:

```text
elapsedActiveDays = diferença civil entre today e startedOn
                    - dias cobertos pelos intervalos de pausa
programDay = min(durationDays, elapsedActiveDays + 1)
```

Intervalos nunca se sobrepõem. Existe no máximo uma pausa aberta por enrollment. `pause` aceita somente `ACTIVE`; `resume` aceita somente `PAUSED`; ambos são idempotentes sob a mesma chave de comando e protegidos contra concorrência.

Durante `PAUSED`, nenhuma conclusão ou registro diário novo é aceito. Fatos anteriores permanecem intactos. A retomada nunca ocorre automaticamente: usuário ou ator administrativo autorizado precisa executá-la conforme a origem e o estado efetivo de membership/tenant.

Suspensão ou inativação de membership e suspensão de tenant abrem pausa administrativa para enrollments ativos. Se uma pausa já estiver aberta, sua origem administrativa é registrada sem criar intervalo sobreposto; a retomada só é permitida quando todos os bloqueios efetivos tiverem terminado.

Abandono encerra uma pausa aberta e o enrollment na mesma transação. A conclusão do período é determinada pelos dias ativos transcorridos, independentemente da completude das atividades; adesão continua sendo métrica separada.

## Casos de borda obrigatórios

- pausa e retomada no mesmo dia local;
- múltiplas solicitações concorrentes;
- pausa atravessando mês, ano ou mudança de offset;
- mudança do timezone do tenant durante o ciclo;
- membership e tenant suspensos simultaneamente;
- abandono durante pausa;
- cálculo nos dias 1 e `durationDays`.

## Consequências

- o cálculo é reproduzível a partir de fatos persistidos;
- nenhum dia parcialmente utilizado é devolvido, evitando colisão de `programDay` com registros existentes;
- pausas administrativas não consomem dias completos do programa;
- o schema precisará impedir intervalos abertos ou sobrepostos concorrentes;
- status e histórico de pausa são consistentes, mas possuem responsabilidades distintas.

