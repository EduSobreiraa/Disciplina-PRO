# Qualidade frontend — BX.5

## Matriz reproduzível

`npm run test:e2e:compatibility --workspace frontend` executa os cenários de sessão anônima, sessão autenticada/catálogo e acessibilidade em Chromium desktop/Pixel 7, Firefox desktop e WebKit desktop/iPhone 13 emulado. Os viewports adicionais são `320×568`, `375×812`, `768×1024` e `1440×900`, na visão geral do Projeto 66. A emulação não comprova uso em dispositivos físicos nem uso assistivo.

A configuração reutiliza o `globalSetup` local: ele **limpa e repovoa o banco de teste**. Aponte `DATABASE_URL` somente para um banco local descartável aceito pela fixture (`disciplina_pro_test`, `disciplina_pro_e2e` ou `disciplina_pro_validation`), aplique as migrations e mantenha essa variável no mesmo ambiente durante o teste. Nunca execute esta configuração contra a infraestrutura externa.

Primeira execução local de 05/09/2026: **27 aprovados e 18 falhas de inicialização**, em 1,1 minuto. Chromium desktop/mobile e Firefox desktop aprovaram os nove cenários de cada projeto. WebKit desktop/mobile não iniciou no Fedora 44 por bibliotecas ausentes.

**Reteste concluído em 05/09/2026:** os **18 testes WebKit passaram em 39,5 segundos** usando o servidor Docker abaixo, com imagem `v1.61.1-noble` (digest `sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48`). Isso completa 45 casos aprovados em duas execuções complementares, sem alterações nos cenários entre elas. A prova cobre a matriz de três arquivos declarada na configuração, não todas as operações do produto nem dispositivos físicos. O CI foi configurado para instalar os três motores e executar Firefox/WebKit após as integrações; Chromium permanece na regressão padrão. A execução desse novo passo no GitHub ainda depende de publicação.

Em um host compatível com Playwright, prepare os navegadores:

```sh
npm exec --workspace frontend -- playwright install --with-deps chromium firefox webkit
npm run prisma:migrate:deploy
npm run test:e2e:compatibility --workspace frontend
```

Para um motor específico, acrescente `-- --project=desktop-firefox` ou `-- --project=desktop-webkit`. Falha de instalação/inicialização do motor não é aprovação nem dispensa do teste. A configuração fica separada da regressão Chromium padrão para permitir a preparação explícita das dependências do sistema.

### Navegador isolado no Docker (Linux)

Alternativa baseada no [servidor remoto oficial do Playwright](https://playwright.dev/docs/docker#remote-connection): testes, API e fixture continuam no host; o contêiner recebe apenas o navegador. Imagem e pacote usam a mesma versão do Playwright instalado no frontend.

```sh
docker run --detach --rm --init --name disciplina-bx5-webkit \
  --network host --user pwuser --workdir /home/pwuser \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  npx -y playwright@1.61.1 run-server --host 127.0.0.1 --port 3333
docker logs disciplina-bx5-webkit
```

Aguarde `Listening on ws://127.0.0.1:3333/`. Com `DATABASE_URL` já apontando para o banco local descartável autorizado:

```sh
PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3333/ \
  npm run test:e2e:compatibility --workspace frontend -- \
  --project=desktop-webkit --project=mobile-webkit
docker stop disciplina-bx5-webkit
```

A rede host permite acessar API/Vite nos endereços localhost previstos pela suíte; o servidor de controle escuta apenas em loopback. Nenhum diretório do repositório ou arquivo de secrets é montado no contêiner. Ao parar, `--rm` elimina o contêiner temporário; a imagem permanece em cache. Atualize ambas as versões juntas ao atualizar Playwright.

## Lighthouse do build local — 05/09/2026

Build auditado: base `a3884b1` com as alterações locais de acessibilidade; JS `index-D9txLcs2.js` e CSS `index-CdP7b5e3.css`. Servido por `npm run preview --workspace frontend -- --host 127.0.0.1 --port 4173`, rota `/login`, sem sessão. Lighthouse `13.4.1`, Chrome headless `149.0.0.0`, via Chrome DevTools MCP, modo navigation.

| Categoria | Desktop | Mobile |
|---|---:|---:|
| Acessibilidade | 100 | 100 |
| Boas práticas | 100 | 100 |
| SEO | 82 | 82 |
| Agentic Browsing | 67 | 67 |

Os três achados são ausência de meta description e respostas inválidas para `robots.txt` e `llms.txt`; o preview SPA retorna HTML para caminhos inexistentes. A política de indexação deve ser avaliada no ambiente de implantação. Não foram adicionados arquivos de descoberta para elevar essas notas.

O comando Lighthouse disponível no MCP não inclui a categoria Performance. Uma gravação separada do DevTools, com reload, CPU 1× e sem limitação de rede, registrou LCP de **64 ms**, TTFB de **2 ms** e CLS de **0,01**. Não houve interação para medir INP. Esses dados são uma observação local, sem comprovação de desempenho de usuários reais ou da rede Vercel/Railway.

Os dez requests observados retornaram `200`: documento, JS, CSS, duas folhas Google Fonts e cinco fontes. O trace estimou economia de 0 ms para os recursos bloqueadores de renderização nessa execução. A árvore de acessibilidade apresentou main, título, campos nomeados e botão de entrada; o login foi inspecionado visualmente no navegador.

Artefatos desta sessão, temporários e não versionados:

- `/tmp/disciplina-bx5-lighthouse-mobile/report.json` e `report.html`;
- `/tmp/disciplina-bx5-lighthouse-desktop/report.json` e `report.html`;
- `/tmp/disciplina-bx5-login-trace.json.gz`.

Para repetir, gere o build, inicie o preview, navegue para `/login` no DevTools MCP, execute `lighthouse_audit` em desktop e mobile e `performance_start_trace` com reload. Registre o commit/estado do candidato e as condições de CPU/rede. O gate externo e as páginas autenticadas ainda precisam de medição própria; esta prova não encerra a BX.5 nem o PP-010.

## Candidato externo — 05/09/2026

Auditoria pública de `https://disciplina-pro-frontend.vercel.app/login`, sem login ou escrita de negócio. O HTML observado referencia `index-DLZuAfvq.js` e `index-Cdjxe-VH.css`; ele não contém as correções locais de contraste. Não foi identificado um commit de deploy pela auditoria.

| Categoria Lighthouse 13.4.1 | Desktop | Mobile |
|---|---:|---:|
| Acessibilidade | 91 | 91 |
| Boas práticas | 100 | 100 |
| SEO | 82 | 82 |
| Agentic Browsing | 67 | 0 |

Acessibilidade falhou em `brand-mark` (contraste 3,97) e `eyebrow` (4,12). Os mesmos elementos foram corrigidos e aprovados no build local; a aprovação externa depende de publicar o candidato corrigido e repetir a prova. Os outros achados são meta description ausente e respostas HTML nos caminhos `robots.txt` e `llms.txt`. A nota de Agentic Browsing não é um critério de acessibilidade ou de performance do produto.

Trace externo em reload, CPU 1× e sem throttling de rede: **LCP 202 ms**, **TTFB 51 ms**, **CLS 0,00** (arredondado pelo DevTools). Cache não foi explicitamente limpo; isso não é uma medição de primeira visita com rede móvel simulada. Não houve interação para medir INP nem dados CrUX. O trace não substitui a categoria Performance do Lighthouse, que não está disponível nesse comando MCP.

Artefatos temporários: `/tmp/disciplina-bx5-external-login-trace.json.gz`, `/tmp/disciplina-bx5-external-lighthouse-mobile/report.json` e `report.html`, e os equivalentes em `/tmp/disciplina-bx5-external-lighthouse-desktop/`.

## Snapshot autenticado local — 05/09/2026

Build servido em `http://localhost:5173` com os mesmos assets locais registrados acima, API compilada em `NODE_ENV=test` e banco `disciplina_pro_e2e`. Login pela identidade fictícia de participante da fixture; sessão restaurada pelos cookies reais. Confirmados os títulos do conteúdo carregado e a ausência de loading antes da coleta.

| Página/estado | Viewport observado | Acessibilidade | Boas práticas |
|---|---|---:|---:|
| `/app/programas`, catálogo remoto | 1350×940 | 100 | 100 |
| `/app/programas/projeto-66`, ciclo disponível | 412×823 | 100 | 100 |

Lighthouse `13.4.1` em modo **snapshot**, preservando a sessão. O viewport móvel foi ajustado com `resize_page` e confirmado por `innerWidth/innerHeight`; apenas passar `device=mobile` à auditoria snapshot não redimensionou o navegador. Os resultados são do estado capturado, não uma auditoria navigation de todas as jornadas. Os relatórios snapshot mostraram SEO `60` e Agentic Browsing `50`; os três achados continuam sendo meta description, robots.txt e llms.txt.

Um trace separado do reload autenticado do Projeto 66, ainda no viewport desktop 1350×940, registrou LCP **119 ms**, TTFB **2 ms** e CLS **0,01**, CPU 1×, sem throttling e sem limpeza explícita de cache. A visão geral carregou o ciclo disponível; não foi iniciado um ciclo nem registrada atividade. Não houve medição de INP. A prova não cobre tracker, ritual, administração, outros estados do programa ou desempenho autenticado externo.

Artefatos temporários: `/tmp/disciplina-bx5-auth-catalog/`, `/tmp/disciplina-bx5-auth-projeto66-mobile-verified/` (cada um com `report.json` e `report.html`) e `/tmp/disciplina-bx5-auth-projeto66-trace.json.gz`. O primeiro snapshot do Projeto 66 em `/tmp/disciplina-bx5-auth-projeto66/` foi coletado em viewport desktop apesar da opção mobile; não o usar como prova móvel.
