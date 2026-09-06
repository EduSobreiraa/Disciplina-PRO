# Validação ampliada do frontend — 06/09/2026 UTC

## Resultado

Correções e matriz automatizada publicadas no commit `3a9457c`. O trabalho paralelo do Sonar não foi incluído. A prova externa concluiu às aproximadamente 01:06 UTC (22:06 de 05/09 em America/Bahia).

- 17 rotas autenticadas: dashboard, catálogo, tracker, ritual, conquistas, missões, protocolo, perfil, sete telas do Projeto 66, administração de tenant e plataforma.
- 34 testes locais aprovados: Chromium desktop/mobile, quatro larguras por rota (320, 375, 768 e 1440), axe, alvos de toque e ausência de erros JavaScript não tratados.
- 6 grupos externos aprovados, cobrindo as mesmas 34 combinações rota/dispositivo, com sessão por perfil (participante, CEO e plataforma). Requisições mutáveis de negócio são bloqueadas e falham o teste; login/refresh/logout são as únicas exceções. Sessões de teste encerradas.
- Lint e build frontend aprovados. Vercel confirmou publicação. O [CI completo 34002915093](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/34002915093) concluiu com sucesso em 06/09/2026, incluindo migrations, lint, tipagem, cobertura, E2E, integrações, Firefox/WebKit, builds, auditoria e análise SonarQube Cloud.

## Correções guiadas pela auditoria

1. Conquistas bloqueadas: removida a opacidade do cartão inteiro, preservando dessaturação e texto de estado; texto permanece legível.
2. Protocolo: faixa vermelha usa o token existente `--vermelho-texto`.
3. Meditação: texto do botão laranja usa o fundo escuro do próprio tema como cor de texto.
4. Tracker: largura mínima da marca passa de 38 para 44 px, mantendo rolagem interna da tabela.
5. Administração: campos e botões recebem área mínima de toque; checkboxes mantêm o tamanho visual, com label associado clicável de pelo menos 44 px.
6. Progresso do Projeto 66: resumo expansível recebe altura mínima e espaçamento de toque.

Foram preservados os tokens/identidades de Disciplina PRO e Projeto 66, sem alteração das regras de negócio.

## Performance observada

| Amostra externa | Resultado máximo observado |
|---|---:|
| LCP nas 34 navegações autenticadas | 2.216 ms |
| CLS nas 34 navegações autenticadas | 0,073 |
| Excesso de duração de tarefas acima de 50 ms, no intervalo observado | 0 ms |

Coleta por PerformanceObserver antes do carregamento; CLS usa janelas de sessão. As medições são de laboratório, sem throttling de rede/CPU, com cache normal. Não equivalem a percentil 75 de usuários reais, TBT oficial do Lighthouse, medição de INP ou benchmark em dispositivo físico. Referência de interpretação: [Web Vitals](https://web.dev/articles/vitals).

Trace Chrome DevTools do login publicado: LCP 308 ms, CLS 0,01, sem throttling; insight de recursos bloqueantes estimou economia de LCP/FCP em 0 ms. Não foi introduzida otimização estrutural sem benefício demonstrado.

Lighthouse local em snapshot, após correções: conquistas/mobile, protocolo/desktop e meditação/mobile com acessibilidade e boas práticas em 100. O MCP não fornece nota de Performance nesse comando. Uma execução na página de erro do Chrome e snapshots posteriores que perderam autenticação foram descartados; não compõem as provas das rotas autenticadas.

O CLS de 0,190 observado em uma carga local de desenvolvimento da plataforma não se repetiu na matriz do build externo: o máximo externo de todas as rotas foi 0,073. Preservar essa distinção entre desenvolvimento e build publicado.

## Reprodução

- Local: `npm run test:e2e --workspace frontend -- page-quality.spec.js` (somente banco local explicitamente destinado aos testes, pois o setup executa seed/reset).
- Externo: definir `E2E_EXTERNAL_BASE_URL` e `E2E_EXTERNAL_PASSWORD` por ambiente seguro e executar `npm run test:e2e --workspace frontend -- --config playwright.external.config.js page-quality-readonly.spec.js`.
- Helper compartilhado: `frontend/e2e-support/page-quality.js`. Cada rota anexa JSON sanitizado de violações, layout e métricas, sem cookies, senhas ou respostas privadas.
- Relatórios desta execução: `/tmp/frontend-quality-final-local.json` e `/tmp/frontend-quality-final-external.json`; temporários, não versionados. Inspeção visual da administração móvel em `/tmp/frontend-admin-final.png`, também não versionada.

## Limites e pendências manuais

- Testar com leitor de tela real (por exemplo, VoiceOver/NVDA), incluindo fluxos interativos completos. Testes em aparelhos físicos não são gate de pré-staging ou staging, conforme decisão operacional de 05/09/2026.
- Medir INP e comportamento sob redes/dispositivos variados; o carregamento automatizado sem interações não comprova INP.
- As verificações de rota cobrem estados iniciais com dados de laboratório, não todas as combinações de formulário, modal e conteúdo possíveis. As suítes funcionais existentes permanecem necessárias.
- Não classificar a aprovação automatizada como encerramento dessas pendências manuais ou como conclusão integral do Sonar.
