# DAST local autenticado — 08/09/2026 UTC

Revisão testada: `fd0a7ee66c3590cd1a9d49733d891a6f8cd8bae4`. Execução interna com OWASP ZAP 2.17.0, API local na porta 3001 e PostgreSQL 18 descartável na porta loopback 55432, somente dados fictícios e envio externo de e-mail desabilitado. Nenhum scan foi dirigido ao ambiente corporativo. Responsável pelo aceite: Eduardo.

## Resultados comprovados

| Verificação | Resultado |
|---|---|
| Sessão, autenticação, CORS e CSRF | 2 suítes, 10/10 testes aprovados |
| Isolamento multi-tenant e permissões | 1 suíte, 7/7 testes aprovados |
| Build backend | Aprovado |
| ZAP com CEO | 103 operações importadas, 265 URLs; relatório JSON sem alertas de risco baixo, médio ou alto |
| ZAP com SUPER_ADMIN | Scan completou sobre 272 URLs; console registrou alertas 100000 (500) e 90022 (Application Error Disclosure); exportação falhou com permissão negada |

O relatório CEO contém três grupos informativos: respostas HTTP de erro do cliente, identificação de autenticação e conteúdo não armazenável. O rótulo `Informational (High)` representa risco informativo com confiança alta, não vulnerabilidade de risco alto.

SHA-256 do JSON CEO: `f3307d3f01a14c1254d9f82ad327a3dd1af2fb0f17511c282375444ca7f77db0`. Artefato local: `/tmp/disciplina-pro-zap-active-retest-QCeYZb/report.json`; temporário, não versionado. A ausência de alertas e os rótulos PASS não demonstram cobertura completa de todas as operações ou payloads, nem ausência de vulnerabilidades.

## DAST-001 — ID inválido causa erro interno

- Rota: `POST /api/platform/tenants/tenantId/invitations/ceo`, autenticada como SUPER_ADMIN fictício.
- Reprodução: enviar um convite fictício usando o texto `tenantId` no parâmetro que deveria identificar um tenant.
- Esperado: rejeição controlada de entrada inválida, preferencialmente HTTP 400.
- Observado: HTTP 500, código `INTERNAL_SERVER_ERROR`, mensagem `Erro interno do servidor`. Resposta contém apenas status, código, mensagem, requestId, timestamp e path; não contém stack ou SQL.
- Pós-condição: consulta ao banco confirmou zero convites para o endereço da reprodução.
- Classificação provisória: defeito de validação/robustez; nenhum vazamento ou acesso cruzado demonstrado nessa reprodução. Correção e reteste pendentes.

## DAST-002 — alerta 90022 ainda não encerrado

O console do scan administrativo identificou `Application Error Disclosure` na mesma rota. A exportação HTML/JSON falhou com `Permission denied` no volume `/zap/wrk`; por isso não foi preservada a instância exata do alerta (requisição, payload e trecho de resposta). A reprodução simples de DAST-001 não confirma vazamento, mas tampouco prova que a requisição original recebeu a mesma resposta. Não classificar este alerta como falso positivo ou vulnerabilidade confirmada sem recuperar essa evidência em um reteste focado.

## Limites e encerramento

Swagger foi habilitado somente no alvo local para importar o contrato. Rate limit local foi elevado para o scanner; seus resultados não validam o limite corporativo. A renderização de conteúdo privado no navegador e a configuração efetiva do proxy corporativo não foram revalidadas nesta rodada. Pentest independente não foi realizado.

## Reteste da correção — 08/09/2026 UTC

A rota passou a usar `ParseUUIDPipe`, seguindo o padrão existente no backend. Quatro casos de ID malformado reproduziram HTTP 500 antes da mudança e passaram a retornar HTTP 400 depois dela, incluindo variantes com barra final e comprovação de ausência de persistência. O teste existente de criação com UUID válido continuou aprovado.

Validação: 18/18 testes de integração de convites/autenticação, build e lint do backend aprovados. Graphify atualizado; a extração das 14 migrations SQL não está disponível porque `tree_sitter_sql` não está instalado.

ZAP 2.17.0 executado novamente com SUPER_ADMIN fictício e OpenAPI restrito à rota afetada: 40 URLs, 118 regras PASS, `FAIL-NEW: 0`, `WARN-NEW: 0`. JSON confirma HTTP 400 em `/api/platform/tenants/tenantId/invitations/ceo` e na variante com barra final. Restaram somente grupos informativos 100000 e 10049. O alerta 90022 não reapareceu; nenhum vazamento foi confirmado. A requisição histórica perdida não foi recuperada, portanto seu status é **não reproduzido após correção**, e não falso positivo comprovado.

Relatórios preservados localmente em `/tmp/disciplina-dast-focused-report.json` e `/tmp/disciplina-dast-focused-report.html`, fora do Git. SHA-256 JSON: `f32c423816c5eb5ef73e60f768dc5767b1fb6e9ffb61d90acfd6d688cb5440a7`. O volume interno Docker permitiu salvar e copiar os artefatos sem o problema de permissão anterior.

DAST-001 corrigido e retestado localmente; DAST-002 não reproduzido no reteste focado. API e recursos descartáveis encerrados após a coleta. A mudança ainda precisa ser publicada no staging e receber smoke do candidato implantado; não foi realizado deploy nesta rodada. Os limites de cobertura descritos acima permanecem válidos.

## Publicação e smoke — 08/09/2026 UTC

Correção publicada no commit `2c148ca0facb4a67271a50a6a07285cd4026b293`, enviado ao `main`. Deploy da API Railway `Disciplina-PRO` no ambiente corporativo de staging (nome Railway `production`): `212db92f-5f73-470f-a19b-9449ccd7a2c4`, estado `SUCCESS`. Inspeção somente leitura do JavaScript compilado no runtime confirmou `ParseUUIDPipe` no controller de convites de plataforma.

Smoke público contra `https://disciplina-pro-frontend.vercel.app`: **2/2 em 4,6 s**, desktop/mobile, login público e readiness com banco disponível. Smoke autenticado somente leitura: **6/6 em 21,5 s**, desktop/mobile, login, refresh, logout, contexto, projeções e administração. Nenhum reset, seed ou escrita de negócio executado no staging.

A primeira execução autenticada teve 5/6 aprovados e um erro local `ENOENT` ao fechar o trace devido à pasta de artefatos compartilhada com o smoke público simultâneo. A repetição foi sequencial, passando `--trace=off` diretamente ao script do workspace, e aprovou todos os cenários. A publicação e o smoke da correção estão concluídos; isso não amplia a cobertura do DAST nem constitui pentest independente.
