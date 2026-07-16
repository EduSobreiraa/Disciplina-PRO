# ADR 010 — Transporte da sessão, CORS e CSRF

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O frontend React e a API podem usar origens distintas. Access token em header não é anexado automaticamente pelo navegador, mas refresh e logout dependem de cookie e exigem defesa contra requisições forjadas.

## Decisão

Staging e produção usarão exclusivamente HTTPS. O access token permanece em memória e segue no header `Authorization`; o refresh token permanece em cookie `HttpOnly` conforme o ADR 009.

CORS usa allowlist exata por ambiente:

- nenhuma origem curinga com credenciais;
- `credentials: true` apenas para origens cadastradas;
- métodos e headers explicitamente permitidos;
- headers iniciais: `Authorization`, `Content-Type`, `X-Tenant-Id`, `X-CSRF-Token` e `X-Request-Id`;
- `Origin: null`, subdomínios por regex ampla e origens desconhecidas são rejeitados;
- configuração falha ao iniciar produção se a allowlist estiver vazia ou inválida.

### CSRF

Requisições autenticadas apenas pelo bearer token não dependem de cookie e não precisam de token CSRF. Endpoints que usam o refresh cookie (`/auth/refresh` e `/auth/logout`) exigem simultaneamente:

1. `Origin` presente e pertencente à allowlist;
2. cookie `SameSite=Lax`;
3. token CSRF assinado, ligado ao `AuthSession.id`, em cookie legível `__Host-dp_csrf` e no header `X-CSRF-Token`;
4. comparação em tempo constante no backend.

O valor CSRF não é segredo de autenticação; sua assinatura impede fabricação ou troca entre sessões. Login valida `Origin`, aplica rate limit e não aceita sessão por cookie preexistente. Métodos seguros não alteram estado.

Cookies usam prefixo `__Host-`, `Secure`, `Path=/` e não definem `Domain`, impedindo que subdomínios sobrescrevam a sessão. A API ignora refresh cookies fora dos casos de uso de autenticação.

Se a implantação futura exigir sites diferentes e `SameSite=None`, ela demandará nova revisão arquitetural; não será habilitada apenas por configuração.

## Consequências

- frontend e API devem preferencialmente permanecer sob o mesmo site registrável, ainda que usem origens distintas;
- o frontend envia `credentials: include` somente em login, refresh e logout e mantém o access token em memória;
- refresh após reload exige o par cookie + CSRF;
- CORS não é tratado como mecanismo de autorização; guards continuam obrigatórios;
- testes de integração cobrirão origens permitidas, rejeitadas, ausentes, preflight, cookie e CSRF inválido.

## Referências

- [OWASP — Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

