# ADR 012 — Convites, entrada nominal e entrega por e-mail

- Estado: aceita
- Data: 23/07/2026
- Fase: B3.0

## Contexto

A B3 transforma uma intenção administrativa em identidade e acesso empresarial. O fluxo precisa criar ou reutilizar `User`, criar `TenantMembership`, atribuir times e consumir um segredo de uso único sem permitir tomada de conta, vínculo cruzado entre tenants, dupla aceitação ou ampliação de escopo por Manager.

O e-mail é um efeito externo falível. Mantê-lo dentro da transação PostgreSQL prolongaria locks e ainda não produziria atomicidade real com SMTP. Por outro lado, retornar o token pela API de produção eliminaria o valor do canal nominal.

## Decisão

### Modelo e lifecycle

`InvitationStatus` possui:

```text
PENDING → ACCEPTED
PENDING → REVOKED
PENDING → EXPIRED
```

`ACCEPTED`, `REVOKED` e `EXPIRED` são terminais. `expiresAt <= now` torna o convite imediatamente ineficaz mesmo antes de um job materializar `EXPIRED`.

`Invitation` contém:

```text
id
tenantId
email
normalizedEmail
role
tokenHash
status
expiresAt
acceptedAt
revokedAt
expiredAt
createdAt
updatedAt
createdByMembershipId?
createdByPlatformAccessId?
```

Exatamente um criador humano é preenchido:

- membership para convites comuns em tenant ativo;
- acesso de plataforma para o primeiro CEO de tenant `PENDING`.

`InvitationTeam` contém `invitationId`, `tenantId`, `teamId` e `role`. O `tenantId` redundante permite FKs compostas que tornam impossível associar convite e time de tenants diferentes.

O banco impõe:

- `UNIQUE (tenantId, normalizedEmail) WHERE status = 'PENDING'`;
- `UNIQUE (tokenHash)`;
- `UNIQUE (invitationId, teamId)`;
- FKs compostas de `InvitationTeam` para `Invitation` e `Team`;
- timestamps coerentes com o status;
- ator criador exclusivo;
- e-mail e hash não vazios.

Somente um convite pendente por e-mail e tenant pode existir. Criar duplicado retorna conflito; não altera silenciosamente role, times ou token. Reenvio é operação explícita, gira o token, renova a expiração e invalida qualquer mensagem anterior. Convites terminais preservam histórico e permitem uma nova linha.

### Token

O token possui 32 bytes aleatórios gerados por CSPRNG e codificados em base64url. Somente HMAC-SHA-256 é persistido, em hexadecimal, com chave própria `INVITATION_TOKEN_PEPPER`; não reutiliza a chave de refresh token.

- TTL do MVP: 72 horas, calculado no servidor;
- token nunca aparece em logs, auditoria ou resposta de produção;
- adapter de e-mail recebe o token somente em memória após o commit;
- o link entregue coloca o token no fragmento do frontend; o navegador o envia à API somente no corpo `POST`, evitando query string em logs de servidor e proxy;
- comparação e consumo ocorrem no repository por hash;
- duas aceitações concorrentes disputam a mesma linha bloqueada, e somente uma pode mudar `PENDING → ACCEPTED`.

Endpoints públicos usam erro genérico `INVITATION_INVALID` para token desconhecido, expirado, revogado ou já consumido.

### Contrato de erros

| Situação | HTTP | Código |
|---|---:|---|
| payload, e-mail, role, time ou token malformado | 400 | `INVALID_INVITATION_DATA` |
| convite pendente já existe para tenant/e-mail | 409 | `INVITATION_ALREADY_PENDING` |
| membership já existe no tenant | 409 | `MEMBERSHIP_ALREADY_EXISTS` |
| capacidade geral insuficiente | 403 | `PERMISSION_DENIED` |
| Manager fora do escopo | 403 | `RESOURCE_SCOPE_DENIED` |
| convite/time não pertence ao tenant atual | 404 | `RESOURCE_NOT_FOUND` |
| token desconhecido, terminal ou expirado | 400 | `INVITATION_INVALID` |
| token válido pertence a `User` existente | 409 | `EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED` |
| identidade autenticada não corresponde ao convite | 400 | `INVITATION_INVALID` |

Falha de entrega não muda o contrato transacional: a resposta de criação/reenvio informa `deliveryStatus: FAILED`, sem token, para que o ator possa tentar novo reenvio.

### Autorização de criação e revogação

CEO:

- convida `USER` ou `MANAGER` no tenant atual;
- escolhe times ativos do tenant;
- `TeamRole.MANAGER` exige convite com `TenantRole.MANAGER`;
- lista e revoga qualquer convite pendente do tenant.

Manager:

- convida somente `USER`;
- precisa indicar ao menos um time ativo que administra atualmente;
- atribui somente `TeamRole.MEMBER`;
- lista e revoga apenas convites criados por si;
- não amplia escopo por identificadores fornecidos pelo cliente.

Convite comum exige tenant `ACTIVE`. Membership existente no mesmo tenant, independentemente do status, bloqueia novo convite; reentrada usa o lifecycle da B2.

Plataforma:

- convida somente o primeiro `CEO` para tenant `PENDING`;
- o convite não possui times;
- falha se o tenant já possuir membership ou convite pendente de CEO;
- não ganha contexto empresarial por criar o convite.

Permissions adicionadas pelo módulo:

```text
INVITATION_READ_SCOPED
INVITATION_CREATE_SCOPED
INVITATION_RESEND_SCOPED
INVITATION_REVOKE_SCOPED
```

O `PermissionGuard` concede a capacidade geral a Manager/CEO; repository e caso de uso resolvem criador, times e ownership no tenant confiável.

### Aceitação segura

Há dois caminhos porque um token nominal não autoriza redefinir credenciais de uma conta já existente.

1. **Nova identidade:** endpoint público recebe token e senha. O e-mail vem exclusivamente do convite. Se já existir `User` com o e-mail normalizado, responde `EXISTING_ACCOUNT_AUTHENTICATION_REQUIRED` e não altera senha.
2. **Identidade existente:** endpoint autenticado recebe somente o token. O `User` atual precisa estar ativo e ter o mesmo e-mail normalizado do convite.

Em uma única transação:

1. bloqueia e valida convite, tenant, e-mail e estado atual;
2. cria o `User` quando aplicável;
3. cria `TenantMembership ACTIVE`;
4. cria `TeamMembership` para times ainda ativos;
5. muda convite para `ACCEPTED`;
6. grava auditoria.

Para o primeiro CEO, a mesma transação cria a membership `CEO`, consome o convite e muda o tenant `PENDING → ACTIVE`. Nenhum endpoint temporário cria CEO diretamente.

Aceitação falha se qualquer time deixou de estar ativo ou se as condições originais de escopo não são mais válidas. Não há aceitação parcial nem remoção silenciosa de times.

### Entrega por e-mail

`InvitationMailer` é um port do módulo. Mailpit é o adapter local, com SMTP na porta 1025 e interface na 8025.

O commit do convite precede o envio. Falha SMTP:

- não desfaz o convite ou expõe o token;
- é registrada sem token;
- retorna estado de entrega ao ator;
- pode ser recuperada por reenvio explícito, que gira o segredo.

Testes de caso de uso usam mailer falso para capturar o token em memória. Testes E2E podem consultar Mailpit somente na fatia de infraestrutura; regras de domínio não dependem do serviço externo.

O provedor de staging, retry automático e bounce permanecem em `PP-015`; Mailpit encerra apenas a dependência local da B3.

### Auditoria

Eventos mínimos:

```text
INVITATION_CREATED
INVITATION_RESENT
INVITATION_REVOKED
INVITATION_ACCEPTED
FIRST_CEO_INVITATION_CREATED
FIRST_CEO_ACCEPTED
```

Metadata pode conter invitation ID, role, IDs de time, motivo controlado e indicador de identidade criada/reutilizada. Nunca contém token, hash, senha ou conteúdo do e-mail.

## Fronteiras

- `identity-access` fornece normalização, política e hash de senha, mas não conhece tenant ou convite;
- `organizations` oferece a composição transacional para membership/time sem endpoint alternativo;
- `invitations` governa token, lifecycle, autorização, aceitação e mailer;
- B4 adicionará disponibilidade de programas após a criação da membership, sem alterar o contrato de uso único.

## Consequências

- token nominal não permite tomada de conta existente;
- aceitação e primeiro CEO preservam atomicidade e invariantes da B2;
- Manager não consegue escolher times fora do escopo;
- falha SMTP não mantém locks nem corrompe lifecycle;
- reenvio invalida mensagens anteriores;
- testes conseguem provar concorrência sem depender de e-mail real.

## Não adotado

- senha sobrescrita ao aceitar convite para conta existente;
- token persistido em texto puro ou retornado por endpoint de produção;
- múltiplos convites pendentes para o mesmo tenant/e-mail;
- envio SMTP dentro da transação;
- remoção silenciosa de time inválido durante aceitação;
- criação direta de membership fora do fluxo de convite.
