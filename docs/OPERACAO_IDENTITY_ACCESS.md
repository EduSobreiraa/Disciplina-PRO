# Operação do Identity Access

> Escopo: encerramento da B1 · nenhuma destas instruções autoriza uso com dados reais antes dos bloqueios P0/P1 registrados.

## 1. Configuração por ambiente

Desenvolvimento e testes geram um par RSA efêmero a cada processo. Reiniciar a API invalida access tokens locais, comportamento deliberado que não pode ser usado em produção.

Produção exige HTTPS e as variáveis:

- `DATABASE_URL`;
- `FRONTEND_URL`, com uma origem exata e sem wildcard;
- `JWT_ISSUER`, `JWT_AUDIENCE` e `JWT_ACTIVE_KID`;
- `JWT_PRIVATE_KEY_BASE64` com PKCS#8 codificado em base64;
- `JWT_PUBLIC_KEYS_JSON`, mapa `kid → SPKI em base64`;
- `REFRESH_TOKEN_PEPPER`, secreto aleatório com pelo menos 32 caracteres.

Chave privada e pepper não entram no Git, em logs, imagens, tickets ou exemplos. O processo falha ao iniciar produção se o material obrigatório estiver ausente ou se o par ativo não corresponder.

## 2. Rotação de chave JWT

1. Gerar novo par RSA de 2048 bits ou superior fora do repositório.
2. Adicionar a nova chave pública ao mapa, mantendo a pública anterior.
3. Publicar a nova chave privada e alterar `JWT_ACTIVE_KID` de forma atômica.
4. Reiniciar a API e confirmar readiness, login e validação de um token anterior.
5. Manter a chave pública anterior por mais de 10 minutos, somando margem de relógio e deploy.
6. Remover a pública anterior somente após expirar todo access token emitido por ela.

Em suspeita de comprometimento, substituir o par, remover imediatamente a chave pública comprometida e revogar todas as sessões afetadas. O ensaio com secret manager permanece obrigatório antes de staging.

## 3. Migrations e bootstrap

Aplicar migrations antes de iniciar a nova versão:

```bash
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

O primeiro `SUPER_ADMIN` é criado uma única vez pelo comando documentado no README. A aplicação e as migrations ainda usam a mesma credencial local; a separação de papéis permanece bloqueio de staging no PP-005.

## 4. Sessões e cookies

- access token: 10 minutos, somente em memória;
- refresh: 7 dias de inatividade;
- sessão: limite absoluto de 30 dias;
- produção: cookies `__Host-`, `Secure`, `SameSite=Lax`, `Path=/` e sem `Domain`;
- refresh e logout: `Origin`, cookie e CSRF ligado à sessão são obrigatórios;
- refresh concorrente no frontend deve ser single-flight.

Executar periodicamente, inicialmente uma vez ao dia:

```bash
npm run sessions:cleanup --workspace backend
```

O comando revoga sessões vencidas e elimina famílias revogadas há pelo menos 90 dias. É idempotente, não remove auditoria e não imprime tokens ou hashes. A agenda gerenciada será definida junto da hospedagem.

## 5. Verificação antes de deploy

```bash
npm ci
npm run prisma:generate
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e
npm run test:integration
npm run build
npm audit --workspaces --audit-level=high
```

Executar migrations e integrações em banco vazio descartável. O deploy não prossegue se o CI ou o Quality Gate falhar.
