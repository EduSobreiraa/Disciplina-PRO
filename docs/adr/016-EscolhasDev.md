# ADR 016 — Fornecedores e parâmetros operacionais do MVP

- Estado: aceita
- Data: 03/08/2026
- Atualizado em: 29/08/2026
- Fase: B10.0
- Decidido por: Eduardo, proprietário do projeto

Este ADR aprova somente as linhas declaradas como decididas. Campos `A DEFINIR`, alternativas ainda sem escolha e validações jurídica/diretiva indicadas como pendentes não integram o escopo aprovado.

## ✅ Decisões fechadas hoje

### Fornecedores e Infraestrutura

| Definição | Decisão | Observações |
|---|---|---|
| Provedor de hospedagem | **Railway** | Revisão prevista se houver crescimento significativo |
| Frontend | **Vercel** | Staging privado; rewrite `/api` para Railway preserva origem única |
| Região de hospedagem dos dados | **us-east (padrão Railway)** | Validar implicações LGPD com Jurídico (dados em território EUA) |
| Serviço de banco de dados | **PostgreSQL via Railway** | — |
| Serviço de armazenamento de backups | **Cloudflare R2** | Já usa Cloudflare para DNS; integração natural |
| Serviço de gestão de segredos | **Railway Environment Variables** (fase inicial); **Doppler** a avaliar no futuro | Sem vault dedicado no MVP |
| Monitoramento e alertas | **OpenTelemetry** para instrumentação; **Sentry** para exceções, stack traces e performance; **BetterStack** para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais | Responsabilidades separadas por finalidade |
| Provedor de e-mail transacional | **Resend** | — |
| Domínio dos e-mails | **`disciplinapro.com.br` — registrado** | Usado para e-mails transacionais; configurar DNS no Cloudflare e validar no Resend. |
| Remetente padrão | `no-reply@disciplinapro.com.br` | Configuração pendente no Resend. |
| Domínio raiz | **`disciplinapro.com.br`** | Página institucional ou redirecionamento; não hospeda a aplicação autenticada no MVP. |
| Produção | **`app.disciplinapro.com.br`** | Frontend e API na mesma origem; API preservada no caminho `/api`. |
| Staging | **`staging.disciplinapro.com.br`** | Ambiente separado; frontend e API na mesma origem, com API em `/api`. |
| API dedicada | **não haverá `api.disciplinapro.com.br` no MVP** | O gateway encaminha `/api` internamente para o backend, preservando cookies, CSRF e origem única. |

### Continuidade e Recuperação

| Definição | Decisão | Observações |
|---|---|---|
| RPO (perda máxima de dados) | **1 hora** | Validar PITR Railway em ensaio; dump lógico diário não substitui essa janela. |
| RTO (tempo máximo de recuperação) | **4 horas** | — |
| Tempo de retenção dos backups | **90 dias** | Validar com Jurídico se há obrigação legal diferente |
| Backup em região/provedor separado | **Sim — Cloudflare R2** | Cópia externa ao Railway |
| Backup lógico independente | **Diário para Cloudflare R2** | Retenção de 90 dias por Lifecycle Rule, preferencialmente |
| Camada adicional Railway | **PITR + backup automático do banco/volume** | Não depender de uma única camada de recuperação |
| Estratégia diante de falha de atualização | **Rollback da aplicação quando compatível; forward-fix quando a migration já aplicada impedir o retorno seguro** | Migration destrutiva exige plano específico, backup verificado e drill; restore de banco não é rollback rotineiro. |

### Operação e Incidentes

| Definição | Decisão | Observações |
|---|---|---|
| Horário de cobertura operacional | **Seg–Sab, 8h–20h** | — |
| Tempo para reconhecer alerta | **30 minutos** | — |
| Tempo para iniciar resposta a incidente | **até 2 horas após o reconhecimento do alerta — definido** | Iniciar diagnóstico, contenção ou comunicação de status; não é prazo de resolução. |
| Canal interno de incidentes | **grupo privado no Telegram — definido** | Alertas podem chegar por Bot API; não enviar dados pessoais, tokens, respostas privadas ou conteúdo de clientes. |
| Operação de incidentes | **Eduardo exclusivamente, por ora — definido** | Recebe alertas, coordena a resposta técnica e registra o incidente por e-mail; ausência de substituto é risco aceito temporariamente. |

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
| Ambientes | **BX em laboratório → staging privado → produção** | BX usa contas técnicas sem dados reais; staging/produção ficam em contas corporativas |
| Plano Railway inicial | **Hobby** | Não subir para Pro preventivamente; reavaliar por limite, consumo ou recurso necessário |
| Sequência de implantação | staging primeiro, produção após validação manual | — |
| Responsável técnico e operacional único | **Eduardo** | É o único responsável pelo sistema: opera código, infraestrutura, banco, segredos, staging, produção, testes e resposta técnica a incidentes; não há substituto técnico atualmente. Aprovações empresariais e jurídicas permanecem nas partes competentes. |
| Aprovação técnica de release | **Eduardo** | Executa testes em staging, decide tecnicamente o go/no-go e registra evidências por e-mail. |
| Registro de comunicação operacional | **e-mail corporativo** | Registra releases, incidentes e respectivas evidências; conteúdo jurídico ou comercial continua sujeito à Spark/Jurídico. |

---

## 🔴 Pendências que ficaram em aberto (requerem outras pessoas)

### Requer Direção da Spark
- Responsáveis pelo canal de privacidade e substituto
- Não há substituto técnico para Eduardo; a Direção deve aceitar e revisar periodicamente esse risco de pessoa-chave
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

## 📝 Notas técnicas geradas pelas decisões

1. **RPO de 1h** → configurar e ensaiar Point-in-Time Recovery no Railway Postgres. O dump lógico diário no R2 é cópia independente de disaster recovery, não substituto do PITR.
2. **Falha de atualização** → seguir o runbook: retornar apenas a aplicação quando o schema continuar compatível; se a migration já aplicada impedir retorno seguro, executar forward-fix. Migration destrutiva exige plano específico, backup verificado e drill; restore de banco é último recurso.
3. **Resend + Cloudflare DNS** → configurar SPF, DKIM e DMARC no Cloudflare assim que o domínio for registrado. O Resend guia esse processo nativamente.
4. **Monitoramento** → manter OpenTelemetry como instrumentação; configurar Sentry para exceções, stack traces e performance; configurar BetterStack para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais; documentar runbook com reconhecimento e escalonamento.
5. **2 ambientes Railway** → variáveis de ambiente devem ser gerenciadas separadamente por ambiente; nunca compartilhar segredos entre staging e produção.
6. **Operação individual** → acessos técnicos permanecem exclusivos de Eduardo; a ausência de substituto exige evidência operacional por e-mail e revisão periódica do risco de pessoa-chave.
7. **Subdomínios** → `app.disciplinapro.com.br` é produção, `staging.disciplinapro.com.br` é staging e ambos preservam a API em `/api` na mesma origem; não criar `api.disciplinapro.com.br` no MVP.
8. **Incidentes** → usar grupo privado do Telegram com Bot API para alertas operacionais; o prazo de início da resposta é de até 2 horas após o reconhecimento, e o e-mail mantém o registro formal.
9. **BX** → contas técnicas/pessoais podem provar configurações com dados fictícios; secrets e tokens corporativos serão sempre novos. O plano detalhado está em [`../PLANO_BX_PRE_STAGING.md`](../PLANO_BX_PRE_STAGING.md).
