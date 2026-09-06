# E-mail Resend — laboratório e staging

## Publicação no laboratório — 05/09/2026

- Implementação publicada no commit `5daf515`; mudanças de tracker/missões ficaram fora deste candidato. API e worker foram atualizados a partir do repositório, com `DEPLOYMENT_STAGE=lab`. O ambiente do Railway chama-se `production`, mas é o único ambiente do projeto de laboratório `valiant-truth`, não o staging/produção corporativos.
- Backup adicional executado e verificado no R2 às `23:38:40 UTC`: `postgres/disciplina-pro-20260905T233837Z.dump` e respectivo `.sha256`. Redeploy do cron, sozinho, apenas prepara a imagem; foi necessário executar/reiniciar o deployment para produzir o backup imediato. O agendamento diário foi preservado.
- API passou a executar `npm run prisma:migrate:deploy --workspace backend` no pre-deploy, com timeout de 300 segundos. As três migrações de e-mail foram aplicadas com sucesso às `23:42 UTC`, pela rede privada; nenhum proxy público foi criado para o banco. O worker permanece sem migração própria.
- Webhook Resend `19f24b25-2867-48bf-9d0f-1ca887b125d5` cadastrado em `https://disciplina-pro-production.up.railway.app/api/webhooks/resend`, com os sete eventos descritos abaixo. Segredo armazenado diretamente no Railway, sem cópia no Git/chat. Chave Resend configurada na API e no worker; destinatário de laboratório restrito a `eduardopires224@gmail.com`.
- Readiness externa `200`; webhook sem assinatura `400`; sonda sintética assinada de tipo não relacionado a e-mail `200`. A sonda não criou evento de entrega: comprova assinatura/roteamento, não recebimento real do provedor.
- Smokes externos: 2 públicos e 6 autenticados aprovados em desktop/mobile, sem reset, seed ou escrita de negócio. Conta fictícia de CEO acessou a organização de laboratório e encerrou a sessão. Antes de ativar o envio, as novas tabelas tinham zero mensagens e nenhum job de retry.
- O CI inicial [33999254862](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33999254862) aprovou 24 E2E backend; o frontend passou 56 cenários, com um skip intencional, e falhou no teste preexistente de timeout do catálogo por verificar a requisição antes da restauração da sessão. Correção restrita ao teste no commit `2569ab0`, validada em 10 repetições locais. O novo [CI 33999858491](https://github.com/EduSobreiraa/Disciplina-PRO/actions/runs/33999858491) passou integralmente em 8m05s: migrações, lint, tipagem, cobertura, E2E, integrações, Firefox/WebKit, builds, auditoria e execução da análise SonarQube. Isso não equivale a declarar zero issues no SonarQube.
- `SMTP_DELIVERY_ENABLED=false` foi preservado na API e no worker durante a publicação. Depois do CI verde e da confirmação de fila vazia, o envio foi habilitado nos dois serviços, mantendo o destinatário único de laboratório. Deployments prontos no commit `2569ab0`: API `ef86b4b1-a8bb-424f-8cfa-f55792598685`; worker `bbd81c7f-78fb-456f-8dff-b42f47437e57`. Guard no processo ativo confirmou estágio, provedor, flag, destinatário e presença do secret antes do envio.
- Um único convite real de participante foi criado pelo CEO fictício na Organização Laboratório: HTTP `201`, convite `01a0740a-c980-753b-a6f8-ab1f632b3084`, provider ID `1b0d9aa0-3938-4dc2-aa0b-532447c06c8f`. O webhook real persistiu `SENT` às `00:07:39.556 UTC de 06/09` e `DELIVERED` às `00:07:40.706 UTC de 06/09` (noite de 05/09 em America/Bahia). Consulta somente leitura no banco privado confirmou associação ao convite e estado final `DELIVERED`, sem polling de status à API Resend.
- Após a correção da rota pública de aceite no commit `0f90921`, o titular confirmou no chat que conseguiu entrar. Isso fecha a prova manual de aceite/criação da conta e acesso, sem coleta de token ou senha. `DELIVERED` comprova entrega ao servidor destinatário, não localização na caixa de entrada. As falhas controladas, o worker de retry e o aviso administrativo foram posteriormente exercitados no laboratório; bounce real do provedor e entregabilidade corporativa permanecem pendentes. Os registros abaixo preservam a sequência das provas locais anteriores.

### Revalidação focada após o aceite real

- 26 integrações aprovadas: `invitation-retries.integration-spec.ts`, `invitation-notices.integration-spec.ts` e `resend-webhook.integration-spec.ts`, no PostgreSQL local `disciplina_pro_e2e`, com transporte simulado e sem chave Resend no processo de teste.
- 34 testes unitários aprovados: `resend-invitation-delivery.spec.ts` e `resend-invitation-notice.delivery.spec.ts`.
- Comprovados: prazo de 30 minutos (relógio passado ao processador, sem espera real), claim único concorrente, persistência após recriação do processador, cancelamento após aceite/revogação/expiração/rotação, ausência de terceira tentativa, revisão de falhas permanentes/ambíguas e aviso sem duplicação ou cascata.
- Limite da prova: esses resultados não comprovam retry ou recebimento do aviso com transporte externo. O aviso seleciona o CEO ativo da organização (ou criador da plataforma no convite inicial de CEO), não qualquer participante nem necessariamente quem criou o convite. O laboratório só permite o destinatário configurado em `RESEND_TEST_RECIPIENT`; não alterar papéis, destinatários ou essa proteção silenciosamente para viabilizar o teste.
- Próxima prova externa requer definir um administrador de teste elegível com e-mail autorizado, preferencialmente em organização isolada. Não simular bounce contra o convite real já aceito, pois isso contaminaria o histórico e poderia suprimir o endereço válido.
- Com autorização explícita do titular, criada a organização `laboratorio-email-isolado` (ID `01a0741d-0ed0-79b3-ba78-01d2e104bf32`), ainda `PENDING`, e enviado um único convite de primeiro CEO ao Gmail autorizado (convite `01a0741d-10e8-7fd3-a712-83b6266089a4`, `PENDING`, transporte `SENT`). O titular deve aceitar com sua conta existente; nenhum papel na organização anterior foi alterado. `SENT` não comprova recebimento. Sessão administrativa encerrada com HTTP 204. Nenhuma falha foi injetada nem aviso administrativo real disparado nesta etapa.
- Após a confirmação de aceite pelo titular, leitura privada comprovou organização `ACTIVE` e membership `01a0741d-5c92-7bb6-a870-c3801f6cf71c` ativa como `CEO`, restrita à organização isolada.
- Prova externa do aviso: criado pelo caso de uso de convites um fixture único `falha-permanente-aviso-01@example.test` (convite `01a0741e-be70-7392-a641-fad9000ddfb0`), com adaptador de envio simulado que registra `PERMANENT` no repositório real. Nenhum envio ocorreu ao endereço fictício; nenhum evento de bounce foi falsificado ou atribuído ao Gmail. O worker publicado consumiu a revisão sem execução manual do processador: `retry_status=REVIEW`, `reason=PERMANENT`, `notice_status=SENT`, claim às `2026-09-06T00:29:28.012Z`. Isso comprova aceitação do aviso real pelo Resend, não recebimento na caixa postal. A confirmação do titular e a prova externa de retry temporário continuam pendentes. O fixture foi preservado para inspeção no painel, sem terceira tentativa ou reenvio do aviso.

### Recebimento do aviso e retry temporário comprovado

- O titular apresentou captura do aviso referente ao convite `01a0741e-be70-7392-a641-fad9000ddfb0`, recebido no spam do Gmail. A prova de recebimento do aviso está concluída. Domínio/DKIM e classificação na caixa de entrada ficam para o staging oficial, conforme orientação do titular; não atribuir o spam exclusivamente ao DKIM.
- Criado um segundo fixture, `falha-temporaria-retry-01@example.test`, na mesma organização isolada, usando o caso de uso publicado com apenas o transporte inicial simulado como `TEMPORARY`. Convite `01a07422-fdb4-7611-8bcc-c4301df3c5df`; job `01a07422-fdd8-73c3-88de-456d402f7434`, persistido como `PENDING`, prazo `2026-09-06T01:04:05.382Z` (05/09 às 22:04:05, America/Bahia). Prazo real de 30 minutos preservado, sem adiantar relógio, alterar configuração ou executar manualmente o processador.
- Leitura somente de dados após o prazo comprovou que o worker reivindicou o job uma única vez às `2026-09-06T01:04:05.705Z`, após o vencimento de `2026-09-06T01:04:05.382Z`. O estado final foi `retry_status=REVIEW`, `reason=EXHAUSTED` e `notice_status=SENT`; o claim do aviso ocorreu às `2026-09-06T01:04:05.889Z`. Não houve reinicialização nem reenvio do fixture.
- O titular confirmou o recebimento do segundo aviso às 22:04 (America/Bahia), também no spam. Assim, a prova fecha o processamento publicado de uma falha temporária controlada, o esgotamento sem terceira tentativa e o aviso único ao CEO autorizado. Nenhum e-mail foi enviado para `example.test`, pois o adaptador bloqueou o destinatário fictício fora da allowlist.
- Limite: não foi um retry entregue com sucesso pelo Resend, nem uma falha temporária produzida pelo provedor. O teste comprova o caminho seguro de exaustão e aviso; a prova de bounce real e a entregabilidade com domínio corporativo/DKIM continuam para o staging oficial. As alterações locais simultâneas de Sonar/qualidade foram preservadas e não publicadas por esta execução.

Rollback operacional: desabilitar envios na API e no worker antes de voltar o binário; preservar tabelas/colunas e o registro de eventos. A configuração de pre-deploy foi adicionada à API (antes era ausente). Não desfazer migrações com DROP, não reinicializar claims/avisos e não expor o banco para efetuar rollback.

## Estado comprovado em 05/09/2026

- Envio básico externo aceito pela API e recebido pelo titular no spam; isso não comprova entregabilidade corporativa.
- Adaptador de convites local, SMTP preservado como padrão, API Resend simulada no ciclo de criação/aceite/rotação/revogação/expiração.
- Receptor `POST /api/webhooks/resend` com corpo bruto limitado, assinatura Svix, proteção temporal da assinatura e persistência antes do HTTP 200.
- Eventos deduplicados por `svix-id`, inclusive concorrentes. Eventos anteriores à resposta de envio são guardados e associados quando o identificador retornado pelo Resend é registrado.
- Estado conservador: reclamação/rejeição/supressão não é apagada por eventos atrasados de entrega. Novos envios via adaptador Resend são bloqueados quando há esse estado registrado para o mesmo endereço normalizado, inclusive em outro convite. Não há liberação automática da supressão.
- Sem token, corpo da mensagem, assunto, destinatário ou payload bruto nas novas tabelas. Elas contêm apenas IDs, estado e datas; a associação ao destinatário usa o convite existente. Corpo do webhook é omitido do serializador de logs; assinatura e secrets são redigidos.

## Configuração

Provas locais: 7 testes de integração do webhook aprovados (assinaturas inválidas/alteradas/expiradas, duplicação concorrente, chegada antecipada, ordem de eventos, supressão, falha de persistência, limite de corpo e ausência de secret); 8 testes E2E do ciclo de convites aprovados; 20 testes focados de transporte e logs aprovados. Lint, tipagem, build e `git diff --check` aprovados. Grafo AST atualizado; os 12 arquivos SQL ficam fora do grafo por ausência do parser SQL, mas a migração foi aplicada e testada pelo PostgreSQL local.

No ambiente do backend, nunca no frontend:

```dotenv
INVITATION_EMAIL_PROVIDER=resend
SMTP_DELIVERY_ENABLED=true
RESEND_API_KEY=<chave privada>
RESEND_FROM=onboarding@resend.dev
RESEND_TEST_RECIPIENT=<único destinatário autorizado>
RESEND_WEBHOOK_SECRET=<segredo de assinatura do webhook>
```

`RESEND_TEST_RECIPIENT` é obrigatório em local/lab com Resend habilitado. O adaptador rejeita outro destinatário em vez de redirecionar um convite alheio. Staging/produção exigem remetente corporativo; `onboarding@resend.dev` não é aceito pela validação desses estágios.

`RESEND_WEBHOOK_SECRET` é diferente da chave de API. Obtê-lo após cadastrar o endpoint HTTPS no Resend. Sem ele, o receptor retorna 503 e não aceita eventos. O endpoint não usa login de usuário: sua autenticação é a assinatura do provedor, validada pela biblioteca Svix sobre o corpo original. Svix 2.x verifica a assinatura sem retornar JSON; interpretar o corpo somente após a verificação.

Assinar os eventos `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` e `email.suppressed`. Eventos assinados fora desse conjunto são reconhecidos sem persistência. Eventos reconhecidos com dados inválidos recebem 400; indisponibilidade de persistência retorna 5xx para permitir nova tentativa do provedor. Não confirmar eventos antes do commit.

## Migração e rollback

Migração aditiva `20260905200000_resend_delivery_tracking`: cria `resend_invitation_messages` e `resend_email_events`, sem transformar convites existentes. Aplicada apenas ao banco local `disciplina_pro_e2e` nesta etapa.

Ordem de rollout: backup e migration → publicar backend → configurar secret e endpoint HTTPS → habilitar eventos e testes controlados. Versões anteriores podem continuar operando com as tabelas extras. Em rollback da aplicação, desabilitar novos envios Resend e preservar ambas as tabelas; não executar DROP para voltar o binário. Eventos não reconhecidos durante a indisponibilidade precisam de replay após recuperação. Não há rollback destrutivo automático.

## Limites e próximo passo — registro anterior à publicação

Esta seção preserva o estado do candidato local antes da publicação descrita no início do documento.

- `SENT` significa aceitação, não chegada à caixa de entrada. `DELIVERED` significa entrega ao servidor destinatário, não ausência de spam.
- `DELAYED` não dispara nova mensagem: o provedor ainda pode estar tentando entregar. `FAILED` ainda não tem classificação automática para retry.
- Retry durável único após 30 minutos para falhas temporárias elegíveis e aviso ao administrador no painel/por e-mail estavam implementados localmente. A publicação e o ensaio externo posteriores estão registrados acima.
- Se a API aceitar o envio e a resposta ou persistência local falhar, a tentativa é ambígua. Não reenviar cegamente nem declarar rejeição do destinatário. A fila implementada mantém essa condição em revisão, respeitando idempotência e sem guardar token em texto puro.
- Nenhum webhook havia sido cadastrado externamente nesta etapa; o cadastro e a prova ponta a ponta ocorreram posteriormente, conforme o registro de publicação.
- Auditoria npm: dois alertas moderados em Prisma/MySQL2 já presentes no lockfile anterior, nenhum alto/crítico; não executar downgrade major automático sugerido pelo audit nesta tarefa.

## Retry durável — candidato local 05/09/2026

A migração aditiva `20260905210000_invitation_email_retry` cria `invitation_email_retries`; foi aplicada somente ao banco `disciplina_pro_e2e`. Não altera as tabelas de convites nem armazena token em texto puro. Rollback: voltar o binário/desabilitar o envio Resend e preservar a tabela; não executar DROP. Jobs `CLAIMED` precisam de revisão antes de retomada após interrupção.

- Elegibilidade inicial: respostas HTTP 429 `rate_limit_exceeded` e 503 `service_unavailable`. Quotas diárias/mensais, autenticação e validação não são tratadas como um rate limit temporário. Timeout, erro de rede, 409 e 500 sem certeza de rejeição são resultados ambíguos; ficam em revisão, sem tentativa cega.
- Um job por convite e geração do token; agendamento de 30 minutos persistido no PostgreSQL. Repetir o registro de uma mesma falha não reinicia o prazo.
- O worker existente `events:worker` processa lotes de até 10 jobs vencidos quando o provedor configurado é Resend e o envio está habilitado. Consulta somente o banco próprio, não endpoints de status do provedor. Nenhum HTTP roda dentro de transação.
- Claim serializado por lock do convite, com nova verificação de status, validade, hash, organização ativa e supressão. Convite aceito/revogado/expirado ou token trocado cancela a tentativa. Aceitação de envio com a mesma geração do token também cancela o job pendente.
- Token aleatório novo gerado no worker, persistindo apenas o hash na mesma transação do claim; a validade original não é estendida. Só o worker vencedor envia. Falha do reenvio fica em `REVIEW`; não há terceira tentativa automática.
- Claim interrompido por mais de 5 minutos vira `REVIEW/INTERRUPTED`, sem repetição automática. Isso privilegia evitar duplicações; uma queda entre claim e chamada HTTP pode exigir intervenção, mesmo sem envio efetivo.
- Webhook de rejeição permanente, reclamação, supressão ou falha terminal registra revisão durável, processada pelo fluxo de avisos abaixo. `DELAYED` continua sem agendar outro envio enquanto o Resend pode estar tentando entregar.
- Neste estágio histórico, o deploy do worker e a prova externa ainda estavam pendentes; ambos foram executados na continuação registrada no início do documento.

Provas desta etapa: 9 casos de integração da fila + 7 de webhook aprovados, 23 testes unitários do adaptador aprovados; lint, tipagem e build backend aprovados. A matriz anterior de 8 casos E2E também foi repetida durante a implementação sem regressões. O prazo de 30 minutos foi exercitado passando o instante de execução aos testes, sem esperar 30 minutos reais ou chamar o Resend.

Referências: [eventos Resend](https://resend.com/docs/webhooks/event-types), [assinaturas](https://resend.com/docs/webhooks/verify-webhooks-requests), [repetição e ordem dos webhooks](https://resend.com/docs/webhooks/introduction).

## Avisos administrativos — candidato local 05/09/2026

- Migração aditiva `20260905220000_invitation_delivery_notices`: acrescenta estado e instante do claim do aviso à fila existente, sem remover dados ou guardar destinatário/token/corpo adicional. Aplicada somente ao banco local `disciplina_pro_e2e`. Aplicar antes do novo backend/worker. Rollback: desabilitar envios/voltar binário e preservar as colunas; não fazer DROP nem reinicializar estados de aviso.
- O painel de convites apresenta a revisão persistida e o estado do aviso por e-mail. CEO vê o tenant; gestor continua vendo somente seus próprios convites. O DTO expõe apenas motivo/estado, nunca hash ou job interno. Recarregar a página atualiza o painel; não foi introduzido polling.
- O worker existente processa até 10 avisos de jobs `REVIEW` por ciclo, após os retries. Envia ao CEO ativo do mesmo tenant, com identidade ativa. Para convite inicial de CEO sem CEO elegível, usa o administrador da plataforma que criou o convite, desde que ativo; não escolhe administrador de outra empresa. O painel implementado é o de administração do tenant, não uma nova central de avisos da plataforma.
- Não havendo destinatário elegível, ou havendo supressão conhecida do endereço, o estado é `BLOCKED`. Local/lab também bloqueia destinatários diferentes de `RESEND_TEST_RECIPIENT`, sem redirecionamento. Os testes desta etapa usam transporte simulado: nenhum e-mail real foi enviado.
- Claim atômico + estado persistido impedem dois workers de enviar o mesmo aviso. Webhooks repetidos da mesma geração não reinicializam esse estado. Chave de idempotência é estável para job/conteúdo. O aviso não contém token de aceite nem endereço do convidado: somente identificador do convite e acesso ao frontend autenticado.
- `SENT` significa aceitação do aviso pelo provedor, não entrega confirmada. `FAILED`, `BLOCKED` e `UNCERTAIN` ficam visíveis no painel. Claim parado por mais de 5 minutos vira `UNCERTAIN`; não há reenvio automático do aviso nem aviso sobre falha do próprio aviso. Isso evita cascatas, mas exige intervenção operacional em falhas de envio.
- A revisão permanece como registro histórico; esta etapa não adiciona botão de reconhecimento/encerramento nem liberação automática de supressão. Trocar configuração não reinicializa avisos bloqueados ou incertos: revisar antes de qualquer repetição manual.

Provas locais: 10 integrações de avisos (concorrência, repetição de eventos, privacidade, escopo CEO/gestor, administrador inicial, destinatário inativo, envio desabilitado e interrupção), somadas às 16 de retry/webhook, aprovadas. 34 testes unitários dos transportes de convite/aviso e 8 E2E do ciclo de convites aprovados. A matriz de administração e alerta passou em Chromium desktop/mobile (10 execuções), incluindo redimensionamento para 320/375/768/1440 px. A prova revelou um mínimo intrínseco da grade que causava overflow em 320 px; a correção ficou restrita à grade/formulário da administração e à quebra de endereços no aviso, preservando os tokens visuais. Lint, tipagem e builds aprovados. A publicação, o webhook externo e o aviso real foram comprovados na etapa posterior registrada no início do documento.
