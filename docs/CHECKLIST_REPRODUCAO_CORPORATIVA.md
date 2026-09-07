# Reprodução corporativa — BY

Preparado em 05/09/2026 como entrega documental da BX.5. Os itens abaixo são futuros: criar o checklist não comprova sua execução. O responsável técnico é Eduardo, conforme o [checklist de definições](CHECKLIST_DEFINICOES_PENDENTES.md). A fonte dos bloqueios continua sendo [Problemas postergados](PROBLEMAS_POSTERGADOS.md).

Para cada item executado, registrar data, responsável, ambiente, commit e link/identificador da evidência. Não registrar valores de segredos, cookies ou tokens.

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
- [ ] Recriar Sentry, fontes OTLP, monitores Better Stack e destinatários corporativos; provar sanitização, alerta, reconhecimento e recuperação usando o [runbook de observabilidade](OPERACAO_OBSERVABILIDADE.md). Configuração e sanitização foram verificadas em 07/09/2026; falta ensaio controlado do ciclo alerta → reconhecimento → recuperação.
- [ ] Ensaiar rotação JWT, revogação e recuperação por comprometimento; tratar invalidação de sessões/convites na troca de peppers.
- [ ] Configurar Resend e DNS de remetente aprovado (SPF/DKIM/DMARC); comprovar envio, retry após 30 minutos, bounce e notificação ao administrador. Configuração e rejeição de webhook não assinado foram verificadas em 07/09/2026; retry/bounce permanecem implementação pendente da BX.4/PP-015 e não houve envio real neste ensaio.
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
| Fase 1 — inventário de runtime corporativo | 06/09/2026 · staging privado corporativo | Railway: API, worker, PostgreSQL, Cleaner e runner `Disciplina-PRO-migrate-staging` | Eduardo | `prisma migrate status`: 14 migrations e schema atualizado; runner `50212b8a-ff72-4c76-a899-35fcb8f409f5` concluído com migrator; API e worker redeployados no commit `b6856f41`; API confirmou `current_user=disciplina_pro_runtime` | Runtime, migrations, menor privilégio e criptografia em trânsito pela rede privada comprovados. O pre-deploy de migrations foi removido da API. `Backup_staging` foi removido temporariamente para liberar o limite de recursos; recriá-lo e validar o primeiro backup/heartbeat é pré-requisito da Fase 2. |
| Fase 3 — observabilidade e e-mail (parcial) | 07/09/2026 · staging privado corporativo | Railway API `Disciplina-PRO` | Eduardo | Ambiente confirmou, sem expor valores: `SENTRY_DSN`, OTLP endpoint/headers e todas as variáveis Resend necessárias presentes; `npm run test --workspace backend -- --runTestsByPath src/logging/log-redaction.spec.ts src/telemetry.spec.ts src/instrument.spec.ts` aprovou 12 testes; `POST /api/webhooks/resend` sem assinatura retornou `400 RESEND_WEBHOOK_INVALID`; readiness retornou `ready`/banco `up` | Configuração e proteção contra webhook não autenticado comprovadas, sem disparar e-mail. Falta ensaio controlado de alerta, reconhecimento e recuperação no Sentry/Better Stack, além de entrega, retry de 30 min, bounce e notificação administrativa (BX.4/PP-015). |

Referências: [Plano BX/BY](PLANO_BX_PRE_STAGING.md), [Roadmap B10](ROADMAP.md) e [governança](../GOVERNANCA.md). Este documento organiza a reprodução; não substitui decisões ainda abertas nem encerra os gates por declaração.
