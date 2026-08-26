# Operação do Identity Access

> Escopo: encerramento da B1 · nenhuma destas instruções autoriza uso com dados reais antes dos bloqueios P0/P1 registrados.

Este runbook cobre Identity Access e gates locais, não um procedimento completo de deploy. Backup, restauração, papéis de banco, secret manager, observabilidade e release permanecem em `PROBLEMAS_POSTERGADOS.md`.

## 1. Configuração por ambiente

Desenvolvimento e testes geram um par RSA efêmero a cada processo. Reiniciar a API invalida access tokens locais, comportamento deliberado que não pode ser usado em produção.

Produção exige HTTPS e as variáveis:

- `DATABASE_URL`;
- `FRONTEND_URL`, com uma origem exata e sem wildcard;
- `JWT_ISSUER`, `JWT_AUDIENCE` e `JWT_ACTIVE_KID`;
- `JWT_PRIVATE_KEY_BASE64` com PKCS#8 codificado em base64;
- `JWT_PUBLIC_KEYS_JSON`, mapa `kid → SPKI em base64`;
- `REFRESH_TOKEN_PEPPER`, secreto aleatório com pelo menos 32 caracteres.
- `INVITATION_TOKEN_PEPPER`, secreto aleatório distinto, também com pelo menos 32 caracteres.
- `SMTP_HOST`, `SMTP_AUTH_USER`, `SMTP_AUTH_PASSWORD`, `SMTP_FROM` e `SMTP_REQUIRE_TLS=true`; o transporte local sem autenticação é aceito somente fora de produção.

Chave privada, peppers e senha SMTP não entram no Git, em logs, imagens ou tickets. O processo falha ao iniciar produção se o material obrigatório estiver ausente, se os peppers forem iguais, se o SMTP não exigir TLS ou se o par ativo não corresponder. Swagger fica desligado por padrão em produção; `SWAGGER_ENABLED=true` só é permitido como escolha deliberada em ambiente privado.

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

## 5. Entrega local de convites

Desenvolvimento usa Mailpit, sem credenciais reais:

```bash
docker compose up -d mailpit
npm run test:mailpit --workspace backend
```

Variáveis relevantes: `INVITATION_ACCEPTANCE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` e `SMTP_FROM`. A URL não contém o token; o adapter acrescenta `#token=...` somente em memória. A UI local fica em `http://localhost:8025`.

Produção/staging não podem usar Mailpit nem os defaults locais. A seleção do provedor, credenciais, retry e bounce permanece no PP-015.

## 6. Verificação antes de deploy

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

Executar migrations e integrações em banco vazio descartável. O deploy não prossegue se o CI ou o Quality Gate falhar. Em 26/07/2026, o gate local de dependências permanece reprovado pelo PP-016; portanto esta lista não comprova prontidão de deploy.
