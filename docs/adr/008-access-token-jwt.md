# ADR 008 — Access token JWT

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O access token precisa identificar usuário e sessão sem congelar role, tenant ou escopo mutáveis. O backend é o único emissor e verificador no MVP, mas a separação de chaves reduz exposição e prepara rotação segura.

## Decisão

O access token será um JWT assinado com `RS256`, duração de 10 minutos e tipo explícito `at+jwt`. O algoritmo aceito será fixado pelo verificador; valores recebidos no header não escolhem algoritmo ou origem de chave arbitrária.

Claims obrigatórias:

```text
iss  emissor configurado por ambiente
aud  disciplina-pro-api
sub  User.id
sid  AuthSession.id
jti  identificador único do token
iat  instante de emissão
exp  instante de expiração
```

O token não contém `tenantId`, `TenantRole`, times, permissões, dados privados ou `PlatformAccess`. O cliente envia o tenant selecionado em header explícito `X-Tenant-Id`; guards e casos de uso consultam sessão, membership, role e escopo atuais no banco. Rotas de plataforma validam `PlatformAccess` atual separadamente.

O JWT é devolvido no corpo do login/refresh, mantido apenas em memória pelo frontend e enviado como `Authorization: Bearer`. Não será salvo em `localStorage`, `sessionStorage` ou cookie.

Cada requisição autenticada valida assinatura, `typ`, algoritmo, `iss`, `aud`, `sub`, `sid`, `jti`, `iat`, `exp`, estado da sessão e estado do usuário. Revogar a sessão bloqueia o token imediatamente, apesar de sua expiração curta.

### Chaves

- chave privada e pública são fornecidas por secret manager ou ambiente, nunca versionadas;
- cada chave possui `kid` conhecido em allowlist local, sem buscar URLs indicadas pelo token;
- assinatura usa somente a chave privada ativa;
- verificação aceita a chave ativa e chaves anteriores durante uma janela maior que 10 minutos;
- rotação remove a chave anterior somente após todos os access tokens emitidos por ela expirarem;
- desenvolvimento usa material local exclusivo, fora do Git.

## Consequências

- mudanças de role, membership, tenant e sessão têm efeito imediato;
- o access token não é usado como cache de autorização;
- cada requisição protegida consulta estado atual, exigindo índices e eventual cache seguro apenas como otimização futura;
- o frontend precisa renovar silenciosamente o token em memória após reload;
- ambientes precisam configurar issuer, audience e par de chaves.

## Referências

- [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html)
- [RFC 7519 — JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)

