# Operação do Identity Access

> Escopo: encerramento da B1 · nenhuma destas instruções autoriza uso com dados reais antes dos bloqueios P0/P1 registrados.

Este runbook cobre Identity Access, configuração segura e gates locais, não um procedimento completo de deploy. Backup, restauração, papéis de banco, observabilidade externa e release permanecem em `PROBLEMAS_POSTERGADOS.md`.

## 1. Configuração por ambiente

Desenvolvimento e testes geram um par RSA efêmero a cada processo. Reiniciar a API invalida access tokens locais, comportamento deliberado que não pode ser usado em produção.

Produção exige HTTPS e as variáveis:

- `DATABASE_URL`;
- `DEPLOYMENT_STAGE=lab|staging|production`, separado de `NODE_ENV`;
- `FRONTEND_URL`, com uma origem exata e sem wildcard;
- `TRUST_PROXY_HOPS`, explicitamente maior que zero; iniciar com `1` no ingresso Railway e só aumentar após restringir o acesso direto ao backend;
- `JWT_ISSUER`, `JWT_AUDIENCE` e `JWT_ACTIVE_KID`;
- `JWT_PRIVATE_KEY_BASE64` com PKCS#8 codificado em base64;
- `JWT_PUBLIC_KEYS_JSON`, mapa `kid → SPKI em base64`;
- `REFRESH_TOKEN_PEPPER`, secreto aleatório com pelo menos 32 caracteres.
- `INVITATION_TOKEN_PEPPER`, secreto aleatório distinto, também com pelo menos 32 caracteres.
- `SMTP_HOST`, `SMTP_AUTH_USER`, `SMTP_AUTH_PASSWORD`, `SMTP_FROM` e `SMTP_REQUIRE_TLS=true`; o transporte local sem autenticação é aceito somente fora de produção.

No laboratório sem e-mail corporativo, use `NODE_ENV=production`, `DEPLOYMENT_STAGE=lab` e `SMTP_DELIVERY_ENABLED=false`. Isso mantém cookies, HTTPS, chaves e demais validações de produção, mas faz cada tentativa de convite terminar como `FAILED` sem contatar SMTP. `staging` e `production` recusam essa desativação e exigem SMTP autenticado com TLS.

Chave privada, peppers e senha SMTP não entram no Git, em logs, imagens ou tickets. O processo falha ao iniciar produção se o material obrigatório estiver ausente, se os peppers forem iguais ou usarem defaults de desenvolvimento, se o `kid` for inválido, se o proxy não estiver declarado, se o SMTP não exigir TLS ou se o par ativo não corresponder. Enquanto não existir controle de acesso dedicado para `/docs`, produção exige `SWAGGER_ENABLED=false`.

Railway termina TLS no proxy e encaminha a requisição ao container; a configuração de cookie continua `Secure`. A Vercel usa rewrite externo como reverse proxy e fornece `X-Forwarded-For`, mas o backend Railway ainda possui URL pública direta. Por isso, não confie em dois saltos apenas para recuperar o IP anterior à Vercel: isso permitiria que chamadas diretas influenciassem o IP aceito pelo rate limit. Validar a topologia novamente quando o ingresso direto for restringido.

Referências operacionais: [Railway Edge Networking](https://docs.railway.com/networking/edge-networking), [Railway frontend authentication](https://docs.railway.com/guides/frontend-authentication), [Vercel request headers](https://vercel.com/docs/headers/request-headers) e [Vercel external rewrites](https://vercel.com/docs/routing/rewrites).

## 2. Geração inicial de chaves e peppers

Gerar o material fora do Railway, sem redirecionar a saída para arquivo:

```bash
npm run security:generate --workspace backend -- lab-2026-08
```

O comando cria em memória um par RSA 2048-bit compatível com `RS256`, dois peppers independentes de 256 bits e imprime as cinco variáveis prontas para cadastro manual no Railway. Não executar em CI e não copiar a saída para logs, documentos ou Git. Depois do cadastro, descartar o terminal e confirmar readiness/login.

## 3. Rotação de chave JWT

1. Gerar novo par RSA de 2048 bits ou superior fora do repositório.
2. Adicionar a nova chave pública ao mapa, mantendo a pública anterior.
3. Publicar a nova chave privada e alterar `JWT_ACTIVE_KID` de forma atômica.
4. Reiniciar a API e confirmar readiness, login e validação de um token anterior.
5. Manter a chave pública anterior por mais de 10 minutos, somando margem de relógio e deploy.
6. Remover a pública anterior somente após expirar todo access token emitido por ela.

Em suspeita de comprometimento, substituir o par, remover imediatamente a chave pública comprometida e revogar todas as sessões afetadas. O ensaio com secret manager permanece obrigatório antes de staging.

Rotacionar `REFRESH_TOKEN_PEPPER` invalida os hashes de refresh existentes; portanto, revogue todas as sessões antes da troca e exija novo login. Rotacionar `INVITATION_TOKEN_PEPPER` invalida convites pendentes; revogue-os e reemita apenas os ainda necessários. Nunca reutilize peppers entre ambientes ou finalidades.

## 4. Logs e dados sensíveis

O logger HTTP estruturado remove `Authorization`, cookies, CSRF, `Set-Cookie`, senhas, tokens, chave privada, peppers e senha SMTP. Query strings e o objeto de query não são registrados; erros HTTP devolvem somente o caminho sem parâmetros. Ao adicionar novos campos secretos, inclua-os no contrato central de redação e em seu teste antes de registrar o objeto.

## 5. Migrations e bootstrap

Aplicar migrations antes de iniciar a nova versão:

```bash
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

O primeiro `SUPER_ADMIN` é criado uma única vez pelo comando documentado no README. A aplicação e as migrations ainda usam a mesma credencial local; a separação de papéis permanece bloqueio de staging no PP-005.

## 6. Sessões e cookies

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

O comando revoga sessões vencidas e elimina famílias revogadas há pelo menos 90 dias. É idempotente, não remove auditoria e não imprime tokens ou hashes.

No laboratório Railway, a limpeza roda em serviço isolado com build `npm run prisma:generate && npm run build`, start command `node backend/dist/src/cli/cleanup-sessions.js` e cron `0 6 * * *` (UTC; `03:00` BRT enquanto o fuso estiver em UTC−3). A execução comprovada em 02/09/2026 terminou com status `Completed` e informou `Sessões expiradas revogadas: 0; sessões eliminadas: 0`. O resultado zero é esperado quando não existem registros elegíveis e confirma a execução idempotente do ciclo.

## 7. Entrega local de convites

Desenvolvimento usa Mailpit, sem credenciais reais:

```bash
docker compose up -d mailpit
npm run test:mailpit --workspace backend
```

Variáveis relevantes: `INVITATION_ACCEPTANCE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` e `SMTP_FROM`. A URL não contém o token; o adapter acrescenta `#token=...` somente em memória. A UI local fica em `http://localhost:8025`.

Produção/staging não podem usar Mailpit nem os defaults locais. A seleção do provedor, credenciais, retry e bounce permanece no PP-015.

## 8. Verificação antes de deploy

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

## 9. Evidência do laboratório BX.3 — 30/08/2026

Os commits `01a44b4`, `6b1e46e` e o hotfix `c388ad5` foram implantados no Railway com `NODE_ENV=production`, `DEPLOYMENT_STAGE=lab`, `TRUST_PROXY_HOPS=1`, Swagger desligado e SMTP deliberadamente desabilitado. A prova externa confirmou readiness direto e pelo rewrite `/api` da Vercel, headers de segurança, origem permitida e rejeitada, CSRF, caminhos sem query refletida, `/api/docs` e `/api/debug-sentry` em `404`, refresh/logout sem sessão em `401 INVALID_SESSION` e rate limit emitindo `429`.

Em navegador, o responsável único pelo sistema confirmou login, restauração da sessão após recarregar, cookies `__Host-dp_refresh` e `__Host-dp_csrf` com `Secure`/`SameSite=Lax`, refresh `HttpOnly` e limpeza de ambos no logout. Os gates locais do estado combinado aprovaram 44 suítes/142 testes unitários; a base PostgreSQL já havia aprovado 33 suítes/92 testes, e o hotfix aprovou adicionalmente sua regressão focada com 1 suíte/6 testes.

O recorte de laboratório da BX.3 está encerrado. Antes de staging público, repetir a matriz com credenciais corporativas, ensaiar rotação/comprometimento e revisar a chave de rate limit após restringir o ingresso direto do Railway; chamadas de verificação vindas de infraestrutura com múltiplos IPs externos não produzem uma sequência determinística de contadores, embora a resposta `429` tenha sido observada.
