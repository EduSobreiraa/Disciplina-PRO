# ADR 016 — Fornecedores e parâmetros operacionais do MVP

- Estado: aceita
- Data: 03/08/2026
- Fase: B10.0
- Decidido por: Eduardo, proprietário do projeto

Este ADR aprova somente as linhas declaradas como decididas. Campos `A DEFINIR`, alternativas ainda sem escolha e validações jurídica/diretiva indicadas como pendentes não integram o escopo aprovado.

## ✅ Decisões fechadas hoje

### Fornecedores e Infraestrutura

| Definição | Decisão | Observações |
|---|---|---|
| Provedor de hospedagem | **Railway** | Revisão prevista se houver crescimento significativo |
| Região de hospedagem dos dados | **us-east (padrão Railway)** | Validar implicações LGPD com Jurídico (dados em território EUA) |
| Serviço de banco de dados | **PostgreSQL via Railway** | — |
| Serviço de armazenamento de backups | **Cloudflare R2** | Já usa Cloudflare para DNS; integração natural |
| Serviço de gestão de segredos | **Railway Environment Variables** (fase inicial); **Doppler** a avaliar no futuro | Sem vault dedicado no MVP |
| Monitoramento e alertas | **OpenTelemetry** para instrumentação; **Sentry** para exceções, stack traces e performance; **BetterStack** para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais | Responsabilidades separadas por finalidade |
| Provedor de e-mail transacional | **Resend** | — |
| Domínio dos e-mails | **A DEFINIR** — domínio ainda não registrado. Recomendação: `disciplinapro.com.br` para e-mails transacionais, separado do domínio institucional `sparkinteligencia.com.br` | Pendente registro |
| Remetente padrão | `no-reply@<domínio>` | — |

### Continuidade e Recuperação

| Definição | Decisão | Observações |
|---|---|---|
| RPO (perda máxima de dados) | **1 hora** | Requer backup/WAL de alta frequência. Railway Postgres PITR (plano pago) atende. |
| RTO (tempo máximo de recuperação) | **4 horas** | — |
| Tempo de retenção dos backups | **90 dias** | Validar com Jurídico se há obrigação legal diferente |
| Backup em região/provedor separado | **Sim — Cloudflare R2** | Cópia externa ao Railway |
| Estratégia diante de falha de atualização | **Rollback automático** (retornar ao deploy anterior) | Migrations devem ser reversíveis; Railway suporta rollback de deploy nativamente |

### Operação e Incidentes

| Definição | Decisão | Observações |
|---|---|---|
| Horário de cobertura operacional | **Seg–Sab, 8h–20h** | — |
| Tempo para reconhecer alerta | **30 minutos** | — |
| Tempo para iniciar resposta a incidente | **A DEFINIR** — sugestão: até 2 horas após reconhecimento | Pendente aprovação da Direção |
| Canal interno de incidentes | **WhatsApp / Telegram do time** | Sentry e BetterStack permitem integração com o fluxo operacional; escolha final do canal permanece pendente |

### Suporte ao Cliente

| Definição | Decisão | Observações |
|---|---|---|
| Canal de suporte ao cliente | **E-mail: `suporte@sparkinteligencia.com.br`** | Separar do `privacidade@` (canal LGPD com obrigações legais distintas) |
| Prazo de resposta ao cliente | **Até 2 dias úteis** (primeira resposta) | — |
| SLA contratual de disponibilidade | **Não haverá no MVP** | Revisitar antes do primeiro cliente enterprise |

### E-mail Transacional

| Definição | Decisão | Observações |
|---|---|---|
| Regra para convite não entregue (bounce) | **Reenviar 1x após 30 minutos** | Se bounce persistir, notificar admin do tenant |
| Política de novas tentativas | **1 reenvio, intervalo de 30 min** | Implementar junto ao módulo `invitations` |

### Ambientes e Deploy

| Definição | Decisão | Observações |
|---|---|---|
| Ambientes | **staging → produção** (2 ambientes no Railway) | — |
| Sequência de implantação | staging primeiro, produção após validação manual | — |

---

## 🔴 Pendências que ficaram em aberto (requerem outras pessoas)

### Requer Direção da Spark
- Responsáveis pelo canal de privacidade e substituto
- Responsável por alertas operacionais, coordenação de incidentes e comunicação a clientes
- Pessoas autorizadas a acessar staging, produção e banco
- Responsável pela aprovação de release e operação pós-lançamento
- Orçamento autorizado para infraestrutura
- Critérios formais de abertura de staging público e produção
- Checklists executivos de autorização de release
- Aceites formais de risco (segurança, automação, acessibilidade)
- Tempo interno para iniciar resposta a incidente (sugestão técnica: 2h)
- Avaliador de acessibilidade

### Requer Jurídico / Especialista em Privacidade
- Toda a Seção 2 do checklist (matriz de tratamento, base legal, papéis, retenção por categoria)
- Validação da região us-east sob LGPD (dados fora do Brasil)
- Retenção de backups (90 dias definido — validar exceções legais)
- Política de privacidade, termos de uso, contrato com tenant
- Hipóteses de anonimização, retenção legal, procedimentos de direitos do titular
- Revisão final de conformidade com LGPD

### Requer definição de produto/domínio
- Registro do domínio (`disciplinapro.com.br` recomendado)

---

## 📝 Notas técnicas geradas pelas decisões

1. **RPO de 1h** → configurar Point-in-Time Recovery no Railway Postgres (plano pago) + job de export para Cloudflare R2 com frequência ≤ 1h.
2. **Rollback automático** → todas as migrations Prisma devem ter `down migration` correspondente; documentar procedimento no runbook.
3. **Resend + Cloudflare DNS** → configurar SPF, DKIM e DMARC no Cloudflare assim que o domínio for registrado. O Resend guia esse processo nativamente.
4. **Monitoramento** → manter OpenTelemetry como instrumentação; configurar Sentry para exceções, stack traces e performance; configurar BetterStack para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais; documentar runbook com reconhecimento e escalonamento.
5. **2 ambientes Railway** → variáveis de ambiente devem ser gerenciadas separadamente por ambiente; nunca compartilhar segredos entre staging e produção.
