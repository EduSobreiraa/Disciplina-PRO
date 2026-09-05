# E-mail Resend — laboratório e staging

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

## Limites e próximo passo

- `SENT` significa aceitação, não chegada à caixa de entrada. `DELIVERED` significa entrega ao servidor destinatário, não ausência de spam.
- `DELAYED` não dispara nova mensagem: o provedor ainda pode estar tentando entregar. `FAILED` ainda não tem classificação automática para retry.
- Retry durável único após 30 minutos para falhas temporárias elegíveis e aviso ao administrador no painel/por e-mail implementados localmente. A política aprovada está na ADR-016; prova com Resend real ainda pendente.
- Se a API aceitar o envio e a resposta ou persistência local falhar, a tentativa é ambígua. Não reenviar cegamente nem declarar rejeição do destinatário. A fila futura precisa reconciliar essa condição, respeitando idempotência e sem guardar token em texto puro.
- Nenhum webhook foi cadastrado externamente nesta etapa. Faltam publicação, secret real, prova ponta a ponta com eventos do Resend e definição de retenção dos registros órfãos/minimais antes da operação oficial.
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
- O deploy do worker e a prova externa permanecem pendentes. Não considerar o pré-staging encerrado.

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

Provas locais: 10 integrações de avisos (concorrência, repetição de eventos, privacidade, escopo CEO/gestor, administrador inicial, destinatário inativo, envio desabilitado e interrupção), somadas às 16 de retry/webhook, aprovadas. 34 testes unitários dos transportes de convite/aviso e 8 E2E do ciclo de convites aprovados. A matriz de administração e alerta passou em Chromium desktop/mobile (10 execuções), incluindo redimensionamento para 320/375/768/1440 px. A prova revelou um mínimo intrínseco da grade que causava overflow em 320 px; a correção ficou restrita à grade/formulário da administração e à quebra de endereços no aviso, preservando os tokens visuais. Lint, tipagem e builds aprovados. Publicação, webhook externo e entrega real do aviso ainda não comprovados.
