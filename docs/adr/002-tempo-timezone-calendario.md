# ADR 002 — Tempo, timezone e calendário

- Estado: aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O Projeto 66 avança por dias de calendário, possui pausas e registros diários. Calcular dias como blocos de 24 horas falha em mudanças de offset e torna o resultado dependente do servidor. Além disso, alterar o timezone de uma empresa não pode reescrever ciclos já iniciados.

## Decisão

1. Todo instante técnico ou de negócio é persistido como `timestamptz(3)` e tratado em UTC na aplicação.
2. O futuro padrão Prisma para instantes será:

```prisma
createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)
```

3. `Tenant.timeZone` é obrigatório e contém um identificador IANA, por exemplo `America/Bahia`; offsets fixos como `-03:00` não são aceitos como timezone do tenant.
4. O tenant inicial usa `America/Bahia` como padrão de bootstrap, mas o valor será explícito e configurável pelo CEO no escopo futuro apropriado.
5. Ao iniciar um enrollment, o timezone do tenant é copiado para `Enrollment.timeZone`. Esse snapshot não muda durante o ciclo.
6. `Enrollment.startedOn` persiste a data civil inicial (`date`) calculada no timezone capturado. `startedAt` continua registrando o instante exato.
7. `programDay` é calculado por diferença entre datas civis no `Enrollment.timeZone`, descontando os intervalos formalmente pausados conforme o futuro ADR de `EnrollmentPause`; nunca por milissegundos divididos por 24 horas.
8. `DailyRecord` persiste `programDay` e `programDate` (`date`) como fatos do ciclo, além do instante de submissão.
9. Expiração de convite, emissão/revogação de sessão e auditoria usam instantes UTC. Datas sem horário usam o tipo PostgreSQL `date`.
10. A API transmite instantes em ISO 8601 UTC e datas civis em `YYYY-MM-DD`. A interface localiza a exibição, sem alterar o fato persistido.

## Invariantes

- timezone do enrollment é imutável após o início;
- mudança de `Tenant.timeZone` afeta apenas operações e ciclos futuros;
- `programDate` pertence ao timezone capturado pelo enrollment;
- no máximo um `DailyRecord` por `(enrollmentId, programDay)`;
- jobs e servidores executam com timezone operacional UTC;
- regras não dependem do timezone do navegador ou do host.

## Casos de borda obrigatórios em testes

- registro imediatamente antes e depois da meia-noite local;
- alteração do timezone do tenant durante um ciclo ativo;
- timestamps recebidos com offsets diferentes representando o mesmo instante;
- dias de mudança de offset em timezones que utilizam horário de verão;
- pausa e retomada atravessando mudança de mês ou ano.

## Consequências

- ciclos permanecem reproduzíveis e auditáveis;
- relatórios podem agrupar por data civil do tenant sem perder o instante original;
- o schema terá campos de data civil deliberados, não derivados implicitamente em cada query;
- será necessária uma biblioteca de timezone baseada em IANA ou `Temporal` quando estável no runtime adotado; a escolha de biblioteca ocorre na implementação, sem alterar este contrato.

## Referências

- [Prisma — tipos nativos PostgreSQL](https://www.prisma.io/docs/orm/prisma-migrate/workflows/native-database-types)
- [Prisma — mapeamento de `DateTime` e `timestamptz`](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
