# ADR 001 — Identificadores UUIDv7

- Estado: aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O Disciplina PRO terá dados globais e multi-tenant, criação por API e referências expostas em rotas autenticadas. IDs sequenciais facilitariam enumeração e acoplariam a aplicação a uma única sequência. UUIDv4 evita isso, mas sua aleatoriedade piora a localidade de índices conforme o volume cresce.

PostgreSQL 18 oferece `uuidv7()`, temporalmente ordenável. Prisma mapeia o tipo nativo `uuid` e permite defaults do banco com `dbgenerated`.

## Decisão

1. Entidades persistentes usam uma chave primária canônica UUIDv7.
2. O PostgreSQL gera o valor; application services não inventam IDs nem dependem do Prisma para gerá-los.
3. O futuro padrão Prisma será:

```prisma
id String @id @default(dbgenerated("uuidv7()")) @db.Uuid
```

4. Chaves estrangeiras usam `String @db.Uuid` e preservam o tipo nativo no banco.
5. UUIDs são opacos. A aplicação não extrai nem usa o timestamp embutido como fato de negócio; `createdAt` continua obrigatório.
6. APIs autenticadas podem expor o UUID canônico. Não será criado um segundo `publicId` sem necessidade comprovada.
7. Conhecer um UUID nunca concede acesso: autorização continua exigindo tenant, role e escopo.
8. Tokens de convite, refresh e recuperação não são UUIDs. São segredos opacos aleatórios, armazenados apenas por hash; o UUID identifica a entidade que contém o token.
9. Chaves naturais como `pillarKey`, slug e e-mail permanecem atributos com constraints próprias, nunca substitutos universais da PK.

## Índices e relações

- toda FK usada em busca ou join deve possuir índice deliberado;
- relações multi-tenant relevantes priorizam índices compostos iniciados por `tenantId`;
- unicidades de negócio continuam explícitas, como `(tenantId, userId)` e `(teamId, membershipId)`;
- ordenação cronológica usa `createdAt`, não a ordenação do UUID.

## Consequências

- IDs são globalmente únicos e adequados a criação distribuída futura;
- índices possuem melhor localidade que UUIDv4;
- o banco torna-se a fonte de geração consistente para Prisma e SQL;
- o requisito mínimo de banco permanece PostgreSQL 18;
- fixtures e testes devem aceitar IDs gerados pelo banco ou fornecer UUIDs válidos explicitamente.

## Não adotado

- autoincremento: enumeração e menor portabilidade entre contextos;
- UUIDv4: válido, porém sem a localidade temporal do UUIDv7;
- CUID/ULID: geração no ORM/aplicação e armazenamento textual sem benefício suficiente para este stack;
- IDs diferentes para uso interno e público: complexidade sem ameaça concreta que a autorização já não deva resolver.

## Referências

- [PostgreSQL 18 — funções UUID](https://www.postgresql.org/docs/18/functions-uuid.html)
- [Prisma — `uuid(7)`, `@db.Uuid` e `dbgenerated`](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
