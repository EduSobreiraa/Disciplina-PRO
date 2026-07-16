# ADR 004 — Lifecycle de TenantMembership

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

`TenantMembership` representa a identidade de um usuário dentro de uma empresa. Seu estado precisa controlar acesso, desligamento e reativação sem apagar histórico, misturar convite com membership ou deixar enrollments ativos consumirem dias durante um bloqueio administrativo.

## Decisão

Os estados serão `ACTIVE`, `SUSPENDED` e `INACTIVE`:

- `ACTIVE`: membership habilitada a operar, desde que `User` e `Tenant` também estejam habilitados;
- `SUSPENDED`: bloqueio temporário, reversível e auditado;
- `INACTIVE`: desligamento explícito, com retenção do histórico e reativação somente por caso de uso autorizado.

Convites pendentes não criam memberships pendentes. A aceitação válida cria a membership diretamente como `ACTIVE`.

Transições permitidas:

```text
ACTIVE → SUSPENDED → ACTIVE
ACTIVE → INACTIVE
SUSPENDED → INACTIVE
INACTIVE → ACTIVE
```

Cada transição exige caso de uso dedicado, transação, autorização por role e escopo, motivo operacional e `AuditEvent`. Não há transição automática por login, novo convite ou alteração de role.

O acesso efetivo a um tenant exige simultaneamente `User`, `Tenant` e `TenantMembership` habilitados. A suspensão do tenant bloqueia seu contexto sem reescrever memberships.

### Autorização e escopo

- `MANAGER` pode inativar e reativar apenas memberships `USER` pertencentes aos times que administra;
- `CEO` pode suspender, inativar e reativar `USER` e `MANAGER` em todo o tenant;
- apenas um caso de uso de plataforma pode substituir, suspender ou inativar o CEO;
- o MVP possui exatamente um CEO ativo por tenant operacional; sua substituição é atômica e nunca deixa o tenant sem CEO;
- a promoção e o rebaixamento entre `USER` e `MANAGER` pertencem ao CEO;
- `TenantRole.MANAGER` não concede escopo sobre terceiros sem `TeamMembership` com `TeamRole.MANAGER` ativa.

A reativação não restaura automaticamente times ou escopos administrativos encerrados. Eles precisam ser atribuídos novamente, pelo responsável autorizado, para impedir recuperação silenciosa de privilégios.

### Efeitos sobre execução

Suspensão ou inativação bloqueia imediatamente novas operações no tenant. Enrollments ativos recebem uma pausa administrativa formal e auditável; não retomam automaticamente com a membership. O formato do intervalo e o cálculo do calendário serão definidos no ADR de `EnrollmentPause`.

Fatos históricos, progresso, XP, conquistas e auditoria não são apagados. Conteúdo privado continua protegido pelas regras de retenção e não se torna visível a gestores após o desligamento.

## Consequências

- o schema precisará de status e timestamps coerentes com cada transição;
- invariantes do último CEO e de unicidade da membership precisam de transação e proteção contra concorrência;
- `TeamMembership` precisará representar encerramento ou atividade efetiva;
- consultas autorizadas sempre validam o estado efetivo, não apenas a existência da membership;
- o desligamento preserva histórico sem manter privilégios residuais.

