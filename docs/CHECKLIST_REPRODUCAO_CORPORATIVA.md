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
- [ ] Separar credenciais migration/runtime e comprovar privilégios mínimos, TLS e dimensionamento do pool por processo (PP-005).
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
- [ ] Recriar Sentry, fontes OTLP, monitores Better Stack e destinatários corporativos; provar sanitização, alerta, reconhecimento e recuperação usando o [runbook de observabilidade](OPERACAO_OBSERVABILIDADE.md).
- [ ] Ensaiar rotação JWT, revogação e recuperação por comprometimento; tratar invalidação de sessões/convites na troca de peppers.
- [ ] Configurar Resend e DNS de remetente aprovado (SPF/DKIM/DMARC); comprovar envio, retry após 30 minutos, bounce e notificação ao administrador. Retry/bounce permanecem implementação pendente da BX.4/PP-015.
- [ ] Repetir inspeção de logs, alertas e interface para provar que tokens de convite e conteúdos privados não vazam com o transporte real.

## Validação e aceite

- [ ] Repetir origem, CORS, CSRF, cookies, rate limit, roles e isolamento tenant; confirmar Swagger fechado conforme configuração aprovada.
- [ ] Executar smoke público e autenticado seguindo [Smoke externo](OPERACAO_SMOKE_TEST_EXTERNO.md), com contas fictícias dedicadas e sem reset/escrita de negócio.
- [ ] Repetir axe, Lighthouse e medições autenticadas no candidato implantado; executar a matriz de [Qualidade frontend](OPERACAO_QUALIDADE_FRONTEND.md), dispositivos físicos e validação assistiva.
- [ ] Definir escopo/janela de DAST e pentest com contas fictícias e registrar achados, correções e reteste.
- [ ] Conferir todos os PP aplicáveis e gates B10.0–B10.4; obter aprovação técnica e decisões empresariais/jurídicas exigidas antes de liberar dados reais.
- [ ] Registrar aprovação de staging e depois a decisão separada de produção, com responsável, commit, evidências e plano de recuperação.

## Registro de execução

| Item | Data/ambiente | Commit/recurso | Responsável | Evidência | Resultado e pendência |
|---|---|---|---|---|---|
| A preencher durante BY | — | — | — | — | Não executado |

Referências: [Plano BX/BY](PLANO_BX_PRE_STAGING.md), [Roadmap B10](ROADMAP.md) e [governança](../GOVERNANCA.md). Este documento organiza a reprodução; não substitui decisões ainda abertas nem encerra os gates por declaração.
