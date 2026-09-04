# Smoke test externo com Playwright

Este procedimento valida o candidato implantado sem iniciar servidores locais e sem preparar, truncar ou popular banco de dados.

## Garantias de segurança

- `playwright.external.config.js` usa somente a URL informada em `E2E_EXTERNAL_BASE_URL`;
- a URL precisa usar HTTPS e não pode conter credenciais, query string ou fragmento;
- a configuração externa não declara `globalSetup` nem `webServer`;
- o smoke público atual faz somente requisições `GET`, `HEAD` e `OPTIONS` e falha se a página emitir outro método;
- o comando não recebe `DATABASE_URL`, não executa `seed-browser-e2e.ts` e não define `E2E_DATABASE_RESET`;
- dados, cookies e credenciais do conjunto E2E local não são reutilizados.

O conjunto local continua sendo executado por `npm run test:e2e:frontend` e mantém seu seed destrutivo limitado ao banco explicitamente autorizado para testes. Nunca use esse comando contra infraestrutura externa.

## Execução

Instale o Chromium uma vez, se necessário:

```bash
npm exec --workspace frontend -- playwright install chromium
```

Execute o smoke contra o frontend implantado:

```bash
E2E_EXTERNAL_BASE_URL=https://disciplina-pro-frontend.vercel.app \
  npm run test:e2e:external
```

O teste roda em Chromium desktop e mobile e comprova:

1. carregamento da fronteira pública de login;
2. presença dos campos e ação de entrada;
3. rewrite `/api/health/ready` do frontend para a API;
4. estado `ready` da API e `up` do PostgreSQL;
5. ausência de requisições mutáveis durante o cenário.

## Limite desta etapa

Este smoke é anônimo e somente leitura. Login, refresh e fluxos de negócio externos exigirão contas fictícias dedicadas, política de limpeza e testes idempotentes; eles pertencem ao próximo item da BX.5 e não devem reutilizar o reset do ambiente local.
