# Operação de observabilidade

## Responsabilidades

- OpenTelemetry: instrumentação e exportação de traces do backend por OTLP/HTTP;
- Sentry: exceções, stack traces sanitizados e performance;
- Better Stack: disponibilidade do frontend/backend, readiness, heartbeat de jobs, incidentes e alerta por e-mail.

O backend não registra um segundo tracer provider. O exportador OTLP é anexado ao provider OpenTelemetry já administrado pelo SDK Sentry, evitando providers globais concorrentes e instrumentação duplicada.

## Configuração OpenTelemetry do backend

A integração fica desligada quando `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` está vazio. Configure no serviço da API Railway:

| Variável | Uso |
|---|---|
| `OTEL_SERVICE_NAME` | nome do serviço nos traces; usar `disciplina-pro-api` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | endpoint HTTPS completo para OTLP/HTTP, normalmente terminado em `/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | credencial exigida pelo receptor, armazenada somente nas variáveis do Railway |
| `OTEL_TRACES_SAMPLER` | modo suportado e obrigatório: `parentbased_traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | proporção entre `0` e `1`; início recomendado no laboratório: `0.1` |

`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` precisa usar HTTPS quando `NODE_ENV=production`. O backend falha cedo se o endpoint ou a proporção de amostragem forem inválidos. Não versionar o valor de `OTEL_EXPORTER_OTLP_HEADERS`.

Para reutilizar o Better Stack já adotado no laboratório, crie uma source de telemetria e copie dela o `Ingesting host` e o `Source token`. Use `https://INGESTING_HOST/v1/traces` como endpoint e `Authorization=Bearer%20SOURCE_TOKEN` como header; o espaço é percent-encoded conforme o formato de headers OTLP. A source de telemetria é diferente dos monitores de uptime e heartbeat já configurados.

## Privacidade

Antes da exportação OTLP, o processador remove:

- texto de queries SQL e descrições de spans de banco;
- corpo e cabeçalhos HTTP;
- authorization, cookies, e-mail, senha, secrets e tokens;
- endereço do cliente, endereço do peer e user agent;
- mensagem e stack trace de eventos de exceção;
- query string e fragmento de URLs.

O Sentry aplica a mesma limpeza para spans enviados à sua camada de performance. Erros continuam seguindo a política já validada: sem request, usuário, mensagens, extras, breadcrumbs ou corpo de exceção, preservando somente `requestId` técnico.

## Prova de implantação

Após cadastrar as variáveis e fazer redeploy da API:

1. confirmar que readiness e login continuam respondendo normalmente;
2. executar algumas chamadas autenticadas, incluindo uma consulta que acesse PostgreSQL;
3. confirmar no receptor OTLP o serviço `disciplina-pro-api`, um trace HTTP e seu span filho de banco;
4. inspecionar os atributos exportados e confirmar ausência de query SQL, headers, tokens, e-mail, IP, query string e corpo;
5. confirmar que um erro `5xx` continua chegando ao Sentry e que `4xx` continua descartado;
6. registrar data, ambiente, receptor e evidência no plano BX, sem copiar credenciais.

Até essa prova externa, a implementação é considerada pronta localmente, mas o item OpenTelemetry da BX.4 permanece aberto.
