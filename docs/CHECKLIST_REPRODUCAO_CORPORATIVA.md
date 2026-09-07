# Reprodução corporativa — BY

Preparado em 05/09/2026 como entrega documental da BX.5. Os itens abaixo são futuros: criar o checklist não comprova sua execução. O responsável técnico é Eduardo, conforme o [checklist de definições](CHECKLIST_DEFINICOES_PENDENTES.md). A fonte dos bloqueios continua sendo [Problemas postergados](PROBLEMAS_POSTERGADOS.md).

Para cada item executado, registrar data, responsável, ambiente, commit e link/identificador da evidência. Não registrar valores de segredos, cookies ou tokens.

## Diretriz do MVP e lançamento controlado — 07/09/2026

O objetivo imediato é colocar o produto em uso por um grupo pequeno e controlado para substituir hipóteses por aprendizado real. O plano separa os controles mínimos que protegem usuários e dados desde o primeiro acesso das melhorias de capacidade e automação que podem evoluir com o produto.

**Gates mínimos antes de abrir o MVP:**

- caminho público frontend → API → banco, login e fluxos principais aprovados;
- backup automático independente, checksum/upload e pelo menos um restore ensaiado; o RPO efetivamente oferecido precisa estar documentado;
- revisão de segurança focada em autenticação, isolamento de tenant, permissões, CORS/CSRF, rate limit e DAST com contas fictícias;
- Sentry, traces e monitor de disponibilidade funcionais, com responsável e procedimento de alerta/ack/recuperação comprovado;
- envio de convite e webhook de entrega funcionais, canal de suporte e plano de rollback/pausa de cadastros.

**Evolução que não bloqueia a beta controlada:** upgrade de plano Railway, PITR/RPO de uma hora, retry entregue com sucesso, bounce/entregabilidade avançada, automação adicional de alertas e runner de migration permanente. Esses itens continuam riscos/objetivos de produção plena; não podem ser declarados concluídos por esta diretriz.

O runner de migrations não precisa ocupar capacidade no cotidiano: ele é recriado pelo runbook antes de qualquer deploy que introduza uma migration versionada. Antes de remover o runner concluído, reativar o backup diário. Se o MVP for aberto sem PITR, a decisão deve registrar explicitamente o RPO aceito, o grupo limitado, o canal de suporte e os critérios para pausar novos cadastros.

## Antes de provisionar

- [ ] Confirmar e-mail corporativo e disponibilidade dos serviços necessários. Vendas, orçamento e contratação são exclusivos do CEO e ficam fora deste trabalho técnico; não se presume contratação concluída.
- [ ] Conferir os itens aplicáveis do gate B10.0. As definições vigentes foram aceitas por Eduardo em 05/09/2026: dados em Virgínia/EUA e recebimento exclusivo do canal de privacidade por Eduardo. Permanecem a comprovação da localização por serviço, documentos/validações jurídicas e evidências técnicas. Google Cloud São Paulo é apenas alternativa de baixa probabilidade. Evidência: decisões no checklist canônico e GOVERNANCA.
- [ ] Criar contas corporativas Vercel, Railway, Cloudflare/R2, Sentry, Better Stack e Resend; ativar 2FA e guardar recuperação com acesso restrito.
- [ ] Inventariar recursos do laboratório e mapear cada serviço ao novo recurso corporativo. Não copiar segredos nem presumir transferência de billing/propriedade.
- [ ] Identificar candidato por commit e registrar aprovação dos gates locais/CI. Manter revisão manual antes de promover a produção.

## Infraestrutura e dados fictícios

- [ ] Recriar staging privado na topologia aprovada: frontend Vercel, API/PostgreSQL Railway e rewrite same-origin `/api`.
- [ ] Configurar DNS/TLS do endereço corporativo aprovado e restringir acesso a staging. Evidência: acesso permitido e negado com usuários previstos.
- [x] Separar credenciais migration/runtime e comprovar privilégios mínimos, TLS e dimensionamento do pool por processo (PP-005). Evidência: `disciplina_pro_migrator` possui ownership dos 36 objetos do schema; `disciplina_pro_runtime` não é superusuário, não cria banco/papéis e não possui `CREATE` no schema. API e worker foram redeployados no commit `b6856f41` com a conta runtime; o runner privado executou migrations com a conta migrator.
- [ ] Gerar chaves RSA e peppers novos, cadastrar variáveis de cada ambiente e comprovar validação fail-fast. Usar o [runbook Identity Access](OPERACAO_IDENTITY_ACCESS.md).
- [ ] Aplicar migrations serializadas antes do runtime; registrar status e bootstrap controlado do primeiro SUPER_ADMIN.
- [ ] Preparar somente identidades e organizações fictícias dedicadas. A fixture destrutiva Playwright local nunca aponta para Railway.
- [ ] Implantar API e worker contínuo com a mesma versão; comprovar readiness, conexão e processamento de evento/XP, conforme [Outbox e recuperação](OPERACAO_OUTBOX_E_RECUPERACAO.md).

## Recuperação, observabilidade e e-mail

- [ ] Recriar bucket privado R2, permissão mínima e retenção de 90 dias; gerar credenciais novas e testar dump, checksum, upload e verificação.
- [ ] Recriar backup diário e heartbeat; comprovar sucesso automático e detecção de ausência/falha.
- [ ] Validar PITR no plano contratado e ensaiar restore em serviço Railway novo, corte manual e RPO/RTO aprovados. O dump diário não substitui o RPO de uma hora. Registrar o aceite formal pendente do PP-007.
- [ ] Ensaiar rollback da aplicação com schema compatível e forward-fix quando incompatível; restore não é rollback rotineiro.
- [ ] Configurar limpeza diária de sessões e registrar execução idempotente.
- [x] Recriar Sentry, fontes OTLP, monitores Better Stack e destinatários corporativos; provar sanitização, alerta, reconhecimento e recuperação usando o [runbook de observabilidade](OPERACAO_OBSERVABILIDADE.md). Em 07/09/2026, Sentry backend/frontend e OTLP foram comprovados; um incidente manual Better Stack foi criado, reconhecido e resolvido pelo responsável, e o alerta de abertura chegou ao e-mail corporativo.
- [ ] Ensaiar rotação JWT, revogação e recuperação por comprometimento; tratar invalidação de sessões/convites na troca de peppers.
- [ ] Configurar Resend e DNS de remetente aprovado (SPF/DKIM/DMARC); comprovar envio, retry após 30 minutos, bounce e notificação ao administrador. Em 07/09/2026, um convite isolado foi aceito pelo Resend e chegou ao destinatário de teste; o webhook persistiu `SENT` e `DELIVERED`. No mesmo dia, o endereço oficial controlado `bounced+staging-admin-notice-2@resend.dev` gerou `BOUNCED` e revisão `PERMANENT`; o worker enviou o aviso ao CEO ativo, confirmado na caixa de entrada. Foram corrigidos no worker o valor de `RESEND_FROM` com aspas literais e uma `RESEND_API_KEY` inválida. Permanece pendente somente a prova externa de retry temporário após 30 minutos (BX.4/PP-015).
- [ ] Repetir inspeção de logs, alertas e interface para provar que tokens de convite e conteúdos privados não vazam com o transporte real.

## Validação e aceite

- [ ] Repetir origem, CORS, CSRF, cookies, rate limit, roles e isolamento tenant; confirmar Swagger fechado conforme configuração aprovada.
- [ ] Executar smoke público e autenticado seguindo [Smoke externo](OPERACAO_SMOKE_TEST_EXTERNO.md), com contas fictícias dedicadas e sem reset/escrita de negócio.
- [ ] Repetir axe, Lighthouse e medições autenticadas no candidato implantado; executar a matriz de [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md) e a validação assistiva. Testes em aparelhos físicos não são gate de staging.
- [ ] Definir escopo/janela de DAST e pentest com contas fictícias e registrar achados, correções e reteste.
- [ ] Conferir todos os PP aplicáveis e gates B10.0–B10.4; obter aprovação técnica e decisões empresariais/jurídicas exigidas antes de liberar dados reais.
- [ ] Registrar aprovação de staging e depois a decisão separada de produção, com responsável, commit, evidências e plano de recuperação.

## Registro de execução

| Item | Data/ambiente | Commit/recurso | Responsável | Evidência | Resultado e pendência |
|---|---|---|---|---|---|
| Fase 0 — baseline e corte corporativo | 06/09/2026 · staging privado corporativo | `b6856f41d2461172c6fd694184d2cf0c04030f25` · Vercel, Railway API/PostgreSQL/worker | Eduardo | API corporativa respondeu `ready` com banco disponível; smoke externo público 2/2 e autenticado 6/6 aprovados, desktop e mobile | Candidato limpo e caminho Vercel → API corporativa → PostgreSQL corporativo validado. Backend anterior permanece somente como rollback temporário; seu desligamento depende das fases de recuperação e ensaio completo. |
| Fase 1 — inventário de runtime corporativo | 06–07/09/2026 · staging privado corporativo | Railway: API, worker, PostgreSQL e Cleaner; runner privado removido após conclusão | Eduardo | `prisma migrate status`: 14 migrations e schema atualizado; runner `50212b8a-ff72-4c76-a899-35fcb8f409f5` concluiu com migrator; API confirmou `current_user=disciplina_pro_runtime`; em 07/09 o serviço concluído `Disciplina-PRO-migrate-staging` foi removido e API/worker/PostgreSQL/Cleaner permaneceram saudáveis. No mesmo dia, Eduardo realizou novo redeploy manual do serviço Railway `Disciplina-PRO` após a promoção do `main` atual (`2453fab` de código; `4fbdad4` inclui somente documentação) e confirmou o deployment em `SUCCESS`, a prontidão pública e o fluxo autenticado básico funcionando. | Runtime, migrations, menor privilégio, criptografia em trânsito e publicação do candidato atual comprovados. O pre-deploy de migrations permanece removido da API; o runner é recriado apenas antes de uma migration futura. |
| Fase 2 — backup diário (validação inicial concluída) | 07/09/2026 · staging privado corporativo | Railway `Backup_staging` · deployment `735a2285-0ee9-4821-a9dc-551b76b1b168` | Eduardo | Serviço privado recriado a partir de `ops/backup/Dockerfile`, cron `0 2 * * *` UTC e política `NEVER`; presença das variáveis obrigatórias confirmada sem expor valores; execução manual terminou `SUCCESS`; R2 exibiu o novo par `disciplina-pro-20260907T144252Z.dump` (aprox. 216 MB) e respectivo `.sha256` (103 B) | Dump, checksum, upload e verificação foram comprovados. O script usa `set -e` e só encerra após `curl --fail` ao heartbeat, portanto o deployment bem-sucedido também comprova o heartbeat aceito. A próxima execução automática diária deve ser observada para confirmar o agendamento; ensaio de restore permanece gate separado. |
| Fase 3 — observabilidade e e-mail (parcial) | 07/09/2026 · staging privado corporativo | Railway API `Disciplina-PRO`/worker · Vercel frontend · tenants isolados de evidência | Eduardo | Ambiente confirmou, sem expor valores: Sentry backend, OTLP endpoint/headers e todas as variáveis Resend necessárias presentes; 12 testes de telemetria/redação aprovados; webhook sem assinatura retornou `400 RESEND_WEBHOOK_INVALID`; três erros sintéticos foram aceitos pelo Sentry backend, ambiente `staging`, release `b6856f41d246`, com conteúdo sanitizado; após configurar `VITE_SENTRY_DSN`/`VITE_APP_ENV` e redeployar Vercel, o navegador publicou a issue `STAGING_FRONTEND_SENTRY_EVIDENCE` no projeto JavaScript/React; trace OTLP sintética foi aceita pelo Better Stack (`200`) e 30 chamadas reais de readiness da API foram todas recebidas como traces; incidente manual Better Stack `Incidente teste` foi criado, reconhecido e resolvido pelo responsável e seu alerta de abertura chegou ao e-mail corporativo; convite `01a0796e-03c2-7f47-bf8f-3acb2e2847df` foi aceito (`SENT`) e o webhook registrou `SENT` às `01:14:08 UTC` e `DELIVERED` às `01:14:10 UTC`; destinatário de teste confirmou recebimento; teste oficial de bounce resultou em `BOUNCED → REVIEW/PERMANENT → aviso SENT`, e o CEO confirmou a chegada do aviso. Durante a prova, `RESEND_FROM` do worker foi corrigido para remover aspas literais e a chave inválida foi substituída | Observabilidade corporativa, proteção contra webhook não autenticado, entrega real, webhook de bounce e notificação administrativa ponta a ponta comprovados. Permanece somente retry temporário de 30 min (BX.4/PP-015). |
| B10.4 — baseline de segurança (parcial) | 07/09/2026 · alvo local descartável | commit `2453fab` · PostgreSQL `disciplina_pro_b10_security_validation` · OWASP ZAP | Eduardo | `npm run audit:dependencies`: zero vulnerabilidades; 32 testes de configuração/telemetria, 2 suítes de sessão/CORS/CSRF e matriz multi-tenant 7/7 aprovados; ZAP baseline passivo contra API local retornou zero alertas baixo/médio/alto/crítico. O único alerta informativo de conteúdo cacheável ocorreu apenas em `/`, `/robots.txt` e `/sitemap.xml` | Baseline automatizado e passivo aprovado sem achados exploráveis. O alvo, API e banco foram descartáveis; não houve varredura no staging corporativo. Pentest autenticado/ativo independente continua pendente. |
| Diretriz de MVP controlado | 07/09/2026 | Plano BY e checklist corporativo | Eduardo | Decisão: priorizar uso real controlado, proteção mínima de dados, segurança e observabilidade; manter melhorias de escala como evolução | Runner de migrations deixa de ser capacidade residente: recriar antes de alteração de schema. PITR/RPO de 1 h não foi dispensado; lançamento sem ele exige aceite explícito do RPO real e limites da beta. |

Referências: [Plano BX/BY](PLANO_BX_PRE_STAGING.md), [Roadmap B10](ROADMAP.md) e [governança](../GOVERNANCA.md). Este documento organiza a reprodução; não substitui decisões ainda abertas nem encerra os gates por declaração.
