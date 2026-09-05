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

## Smoke autenticado somente leitura

Use exclusivamente as identidades fictícias materializadas pela seed de laboratório. A senha deve ser informada no ambiente do processo e nunca registrada no terminal, no repositório ou no relatório do Playwright.

As identidades padrão são `lab-user@disciplina.test` para os fluxos de participante e `lab-ceo@disciplina.test` para administração. Para substituí-las, use `E2E_EXTERNAL_PARTICIPANT_EMAIL` e `E2E_EXTERNAL_ADMIN_EMAIL`.

Com uma senha comum às duas identidades:

```bash
E2E_EXTERNAL_BASE_URL=https://disciplina-pro-frontend.vercel.app \
E2E_EXTERNAL_PASSWORD='<senha obtida do cofre>' \
  npm run test:e2e:external:authenticated
```

Se as contas tiverem senhas distintas, omita `E2E_EXTERNAL_PASSWORD` e use `E2E_EXTERNAL_PARTICIPANT_PASSWORD` e `E2E_EXTERNAL_ADMIN_PASSWORD`. A suíte falha antes de abrir o navegador quando alguma senha obrigatória estiver ausente.

As seis execuções — três cenários em desktop e mobile — validam:

1. login pela interface, cookie de sessão, refresh após reload e logout;
2. identidade e contexto do tenant;
3. projeção do Projeto 66;
4. projeções do tracker e do ritual diário;
5. administração do tenant e listagem de convites para CEO/MANAGER;
6. ausência de `POST`, `PUT`, `PATCH` ou `DELETE` de negócio.

Somente `/api/auth/login`, `/api/auth/refresh` e `/api/auth/logout` podem usar métodos mutáveis. O teste não preenche nem envia formulários de tracker, ritual, programa, administração ou convite.

## Evidência de execução

Em 05/09/2026, o comando autenticado foi executado contra `https://disciplina-pro-frontend.vercel.app` usando as identidades fictícias dedicadas. As seis execuções passaram em `26,1 s`: os três cenários foram aprovados tanto no Chromium desktop quanto no viewport mobile. Nenhuma operação de seed, reset de banco ou escrita de negócio foi realizada.

### Reteste do candidato `b775bed` — 05/09/2026

As **6 execuções autenticadas passaram em 22,9 segundos**, nos projetos Chromium desktop e mobile. Os assets publicados foram confirmados como `index-q5MOUuyA.js` e `index-CdP7b5e3.css`, os mesmos do candidato auditado. A senha foi carregada do `.env` local ignorado pelo Git, sem impressão; `DATABASE_URL` foi removida do ambiente do processo de teste e os traces foram desativados com `--trace=off` para não persistir credenciais de login nos artefatos de rede.

A prova cobre login pela interface, contexto de tenant, refresh, logout, leitura do Projeto 66, tracker, ritual, administração e convites, sem seed, reset ou escrita de negócio. Não substitui auditoria de acessibilidade/performance das páginas autenticadas.

## Limite desta etapa

O smoke autenticado cobre disponibilidade, autorização, sessão e leitura das projeções principais. Operações de escrita externas exigirão dados descartáveis, limpeza idempotente e contrato explícito por cenário; elas não reutilizarão o reset do ambiente local.

## Matriz local de resiliência

Timeout e respostas sintéticas de erro não devem ser provocados no ambiente implantado. A suíte local intercepta somente a leitura de `/api/programs`, cobre timeout de transporte, `401`, `403`, `409`, `429` e `503` e confirma que o usuário recebe um alerta e consegue recuperar a tela por retry:

```bash
npm run test:e2e --workspace frontend -- error-resilience.spec.js
```

Esse comando usa o `globalSetup` destrutivo protegido do Playwright e, portanto, exige `NODE_ENV=test`, a confirmação interna da fixture e `DATABASE_URL` apontando exclusivamente para `disciplina_pro_test`, `disciplina_pro_e2e` ou `disciplina_pro_validation`. Nunca o execute contra Railway, staging ou produção.
