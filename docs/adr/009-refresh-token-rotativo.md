# ADR 009 — Refresh token opaco e rotativo

- Estado: Aceita
- Data: 15/07/2026
- Fase: B0.5

## Contexto

O access token curto exige renovação sem solicitar senha repetidamente. Um refresh token reutilizável e persistido em texto puro ampliaria o impacto de vazamento e impediria detectar replay.

## Decisão

Refresh tokens serão segredos opacos com ao menos 256 bits aleatórios, nunca JWTs. O banco persiste somente hash com HMAC-SHA-256 e pepper externo ao banco.

Cada login cria uma `AuthSession` e uma família de tokens independente por dispositivo. Cada refresh válido é consumido uma única vez, gera novo access token e novo refresh token na mesma transação e registra o vínculo com o sucessor.

Se um token já consumido for apresentado novamente, o sistema considera reutilização: revoga toda a família, invalida a sessão e registra evento de segurança. O frontend deve serializar renovações em uma operação single-flight para evitar falsos replays entre requisições concorrentes.

Política inicial:

- inatividade máxima de 7 dias por refresh token;
- duração absoluta da sessão de 30 dias, não estendida pela rotação;
- múltiplos dispositivos criam sessões e famílias separadas;
- logout revoga a sessão atual e remove cookies;
- “sair de todos os dispositivos” revoga todas as sessões do usuário;
- troca de senha, desativação de usuário ou incidente de segurança revoga todas as sessões;
- registros revogados podem ser eliminados após 90 dias, preservando apenas auditoria sem hashes ou segredos.

Campos mínimos da persistência:

```text
AuthSession: id, userId, familyId, createdAt, absoluteExpiresAt, revokedAt
RefreshToken: id, sessionId, tokenHash, expiresAt, consumedAt,
              revokedAt, replacedByTokenId, createdAt
```

O refresh token é enviado somente em cookie `__Host-dp_refresh`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain`. Em desenvolvimento local, a exceção ao atributo `Secure` é explícita e proibida em staging/produção.

## Concorrência e falhas

- consumo e emissão do sucessor ocorrem em transação com proteção contra dupla utilização;
- falha antes do commit não consome o token;
- resposta perdida depois do commit exigirá novo login, pois repetir o token acionará detecção de reuse;
- tokens e cookies são redigidos de logs e nunca entram em `AuditEvent.metadata`.

## Consequências

- roubo e replay tornam-se detectáveis e limitados à família afetada;
- o banco mantém estado de sessão deliberadamente, permitindo revogação imediata;
- perda de uma resposta de refresh privilegia segurança sobre conveniência;
- o frontend precisa coordenar refresh concorrente e tratar sessão revogada;
- limpeza periódica remove dados efêmeros após a retenção definida.

## Referências

- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)

