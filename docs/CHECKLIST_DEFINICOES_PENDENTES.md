# Checklist de definições pendentes

> Disciplina PRO · Atualizado em 03/08/2026 · Reconciliado com o ADR 016

Preencher somente os campos `A DEFINIR`. Registrar a decisão, a data, o aprovador e a evidência no documento canônico indicado.

## 1. Direção da Spark

### Responsáveis e aprovações

| Definição | Valor | Decide/aprova | Limite | Fonte |
|---|---|---|---|---|
| Responsável interno pelo canal de privacidade | **A DEFINIR** | Direção da Spark | agora | PP-004 |
| Substituto do responsável pelo canal de privacidade | **A DEFINIR** | Direção da Spark | agora | PP-004 |
| Responsável por receber alertas operacionais | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Substituto do responsável por alertas | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Responsável por coordenar incidentes | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Responsável por autorizar comunicação a clientes em incidente | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Pessoas autorizadas a acessar staging | **A DEFINIR** | Direção da Spark | antes de staging privado | B10.0 |
| Pessoas autorizadas a acessar produção | **A DEFINIR** | Direção da Spark | antes de produção | PP-005/B10.1 |
| Pessoas autorizadas a administrar o banco | **A DEFINIR** | Direção da Spark | antes de staging privado | PP-005 |
| Pessoas autorizadas a acessar o cofre de segredos | **A DEFINIR** | Direção da Spark | antes de staging privado | PP-006 |
| Responsável pela aprovação de release | **A DEFINIR** | Direção da Spark | antes de staging público | B10.5 |
| Responsável operacional após o lançamento | **A DEFINIR** | Direção da Spark | antes de produção | GOVERNANCA |

### Ambientes e fornecedores

| Definição | Valor | Decide/aprova | Limite | Fonte |
|---|---|---|---|---|
| Provedor de hospedagem | **Railway — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016 |
| Região de hospedagem dos dados | **us-east — DEFINIDA; validação jurídica pendente** | proprietário + Jurídico | antes da contratação/uso com dados reais | ADR-016/PP-004 |
| Serviço de banco de dados | **PostgreSQL via Railway — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016 |
| Serviço de armazenamento de backups | **Cloudflare R2 — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016/PP-007 |
| Serviço de gestão de segredos | **Railway Environment Variables no MVP — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016/PP-006 |
| Instrumentação | **OpenTelemetry — DEFINIDO** | proprietário do projeto | implementar antes de staging público | ADR-016/PP-008 |
| Exceções, stack traces e performance | **Sentry — DEFINIDO** | proprietário do projeto | contratar e implementar antes de staging público | ADR-016/PP-008 |
| Uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais | **BetterStack — DEFINIDO** | proprietário do projeto | contratar e implementar antes de staging público | ADR-016/PP-008 |
| Provedor de e-mail transacional | **Resend — DEFINIDO; contrato pendente de validação** | proprietário + Jurídico | antes de staging com e-mail real | ADR-016/PP-015 |
| Domínio dos e-mails | **A DEFINIR E REGISTRAR** | Direção da Spark | antes de staging com e-mail real | ADR-016/PP-015 |
| Remetente dos e-mails | **no-reply@<domínio> — FORMATO DEFINIDO** | proprietário do projeto | depende do domínio | ADR-016 |
| Ferramenta adicional de segurança ou manutenção da mitigação atual | **A DEFINIR** | Direção da Spark | antes do release | PP-014 |
| Avaliador de acessibilidade interno ou contratado | **A DEFINIR** | Direção da Spark | durante staging | PP-010 |
| Orçamento autorizado para infraestrutura e serviços externos | **A DEFINIR** | Direção da Spark | antes das contratações | B10.0 |

### Continuidade e operação

| Definição | Valor | Decide/aprova | Limite | Fonte |
|---|---|---|---|---|
| Perda máxima aceitável de dados (RPO) | **1 hora — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016/PP-007 |
| Tempo máximo aceitável para recuperar o serviço (RTO) | **4 horas — DEFINIDO** | proprietário do projeto | comprovar antes de produção | ADR-016/PP-007 |
| Tempo de armazenamento dos backups | **90 dias — DEFINIDO; validação jurídica pendente** | proprietário + Jurídico | antes de dados reais | ADR-016/PP-007/PP-004 |
| Cópia de backup em provedor separado | **Sim, Cloudflare R2 — DEFINIDO** | proprietário do projeto | implementar antes de staging privado | ADR-016/PP-007 |
| Horário de cobertura operacional | **segunda a sábado, 8h–20h — DEFINIDO** | proprietário do projeto | operar antes de staging público | ADR-016/PP-008 |
| Tempo interno esperado para reconhecer um alerta | **30 minutos — DEFINIDO** | proprietário do projeto | operar antes de staging público | ADR-016/PP-008 |
| Tempo interno esperado para iniciar resposta a incidente | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Canal interno de incidentes | **A DEFINIR: WhatsApp ou Telegram** | Direção da Spark | antes de staging público | ADR-016/PP-008 |
| Critério para comunicar incidente a clientes | **A DEFINIR** | Direção + Jurídico | antes de produção | PP-008 |
| Critério de aceite do ensaio de restauração | **A DEFINIR** | Direção da Spark | antes de produção | PP-007/B10.3 |
| Estratégia empresarial diante de falha de atualização | **rollback automático — DEFINIDO** | proprietário do projeto | implementar e ensaiar antes de produção | ADR-016/PP-007 |

### Clientes, suporte e compromissos

| Definição | Valor | Decide/aprova | Limite | Fonte |
|---|---|---|---|---|
| Existirá compromisso contratual de disponibilidade | **não no MVP — DEFINIDO** | proprietário do projeto | revisar antes do primeiro cliente enterprise | ADR-016 |
| Percentual de disponibilidade prometido no MVP | **não aplicável — sem SLA contratual** | proprietário do projeto | revisar antes do primeiro cliente enterprise | ADR-016 |
| Canal de suporte ao cliente | **suporte@sparkinteligencia.com.br — DEFINIDO** | proprietário do projeto | operar antes do primeiro cliente | ADR-016 |
| Prazo operacional de primeira resposta ao cliente | **até 2 dias úteis — DEFINIDO** | proprietário do projeto | operar antes do primeiro cliente | ADR-016 |
| Volume inicial esperado de e-mails | **A DEFINIR** | Direção da Spark | antes da contratação | PP-015 |
| Regra empresarial para convite não entregue | **1 reenvio após 30 minutos; persistindo, notificar admin do tenant — DEFINIDA** | proprietário do projeto | implementar antes do primeiro cliente | ADR-016/PP-015 |
| Critério empresarial para abertura de staging público | **A DEFINIR** | Direção da Spark | antes de staging público | B10.5 |
| Critério empresarial para abertura de produção | **A DEFINIR** | Direção da Spark | antes de produção | B10.5 |
| Checklist executivo de autorização de release | **A DEFINIR** | Direção da Spark | antes de produção | B10.5 |
| Registro formal de autorização ou recusa de staging | **A DEFINIR** | Direção da Spark | antes de staging público | B10.5 |
| Registro formal de autorização ou recusa de produção | **A DEFINIR** | Direção da Spark | antes de produção | B10.5 |

### Riscos e acessibilidade

| Definição | Valor | Decide/aprova | Limite | Fonte |
|---|---|---|---|---|
| Aceite temporário dos alertas de segurança para staging privado | **A DEFINIR** | Direção da Spark | antes de staging privado | PP-016 |
| Limite e condições do aceite temporário | **A DEFINIR** | Direção da Spark | junto do aceite | PP-016 |
| Data de revisão do aceite temporário | **A DEFINIR** | Direção da Spark | junto do aceite | PP-016 |
| Exceção formal para produção caso restem alertas | **A DEFINIR** | Direção da Spark | antes do release | PP-016 |
| Aceite do risco residual da automação de segurança atual | **A DEFINIR** | Direção da Spark | antes do release | PP-014 |
| Data de revisão do risco da automação de segurança | **A DEFINIR** | Direção da Spark | junto do aceite | PP-014 |
| Fluxos obrigatórios na validação de acessibilidade | **A DEFINIR** | Direção da Spark | durante staging | PP-010 |
| Dispositivos obrigatórios na validação | **A DEFINIR** | Direção da Spark | durante staging | PP-010 |
| Tecnologias assistivas obrigatórias na validação | **A DEFINIR** | Direção + especialista | durante staging | PP-010 |
| Barreiras de acessibilidade que bloqueiam release | **A DEFINIR** | Direção + especialista | antes do release | PP-010 |
| Barreiras não bloqueantes permitidas após o MVP | **A DEFINIR** | Direção + especialista | antes do release | PP-010 |

## 2. Jurídico ou especialista em privacidade

### Matriz de tratamento

Preencher uma linha para **cada operação de tratamento**. Não classificar a Spark globalmente.

| Definição por operação | Valor | Aprovação | Limite | Fonte |
|---|---|---|---|---|
| Nome da operação de tratamento | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Categorias de dados utilizadas | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Titulares envolvidos | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Finalidade | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Base legal | **A DEFINIR** | Jurídico | antes de dados reais | PP-004 |
| Papel da Spark: controladora, operadora ou responsabilidade conjunta | **A DEFINIR** | Spark + Jurídico | antes do contrato | PP-004 |
| Papel do tenant | **A DEFINIR** | Spark + Jurídico | antes do contrato | PP-004 |
| Dados compartilhados | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Destinatários ou fornecedores | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Transferência internacional, se houver | **A DEFINIR** | Jurídico | antes da contratação | PP-004 |
| Tempo de armazenamento | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Destino após o prazo | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Responsável interno | **A DEFINIR** | Direção da Spark | antes de dados reais | PP-004 |
| Evidência do tratamento | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |

### Retenção por categoria de dado

| Categoria | Definição pendente | Decide/valida | Limite | Fonte |
|---|---|---|---|---|
| Identidade e cadastro do usuário | tempo e destino após encerramento | Spark + Jurídico | antes de dados reais | PP-004 |
| Empresa cliente e vínculos de participantes | exceções ao prazo de até 60 dias e destino final | Spark + Jurídico | antes de dados reais | PP-004 |
| Times e vínculos organizacionais | tempo e destino após inativação | Spark + Jurídico | antes de dados reais | PP-004 |
| Convites e histórico de entrega | tempo e destino após expiração, uso ou revogação | Spark + Jurídico | antes de dados reais | PP-004/PP-015 |
| Participações em programas | tempo e destino após conclusão ou abandono | Spark + Jurídico | antes de dados reais | PP-004 |
| Fatos objetivos de execução | tempo e destino | Spark + Jurídico | antes de dados reais | PP-004 |
| Respostas e conteúdo privado | tempo, exportação e destino | Spark + Jurídico | antes de dados reais | PP-004 |
| Tracker e ritual, quando migrarem para o servidor | tempo e destino | Spark + Jurídico | antes da migração com dados reais | PP-002/PP-004 |
| Pontos e conquistas | tempo e destino | Spark + Jurídico | antes de dados reais | PP-004 |
| Registros de auditoria | exceções legais/contratuais ao prazo aprovado de 1 ano | Jurídico | antes de dados reais | PP-004 |
| Sessões e registros temporários de autenticação | validar prazo técnico e exceções aplicáveis | Jurídico | antes de dados reais | PP-004/ADR-009 |
| Logs operacionais e alertas | tempo e campos permitidos | Spark + Jurídico | antes de staging público | PP-004/PP-008 |
| Backups | tempo, localização e destino | Spark + Jurídico | antes de staging privado | PP-004/PP-007 |
| Dados de entrega de e-mail | tempo e destino | Spark + Jurídico | antes do provedor real | PP-004/PP-015 |

### Exclusão, anonimização e direitos

| Definição | Valor | Decide/valida | Limite | Fonte |
|---|---|---|---|---|
| Dados mínimos preserváveis após anonimização de participante | **A DEFINIR** | Jurídico + Spark | antes de dados reais | PP-004 |
| Hipóteses em que anonimização não é juridicamente permitida | **A DEFINIR** | Jurídico | antes de dados reais | PP-004 |
| Hipóteses de retenção legal após encerramento de tenant | **A DEFINIR** | Jurídico | antes de dados reais | PP-004 |
| Procedimento de confirmação da solicitação do titular | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Procedimento de autenticação da identidade do solicitante | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Formato da declaração completa de acesso | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Procedimento para correção | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Procedimento para exportação | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Procedimento para anonimização ou exclusão | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Prazo operacional das solicitações sem prazo legal específico | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Modelo de registro e comprovação do atendimento | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Regra de comunicação entre Spark e tenant no atendimento | **A DEFINIR** | Spark + Jurídico | antes do contrato | PP-004 |

### Documentos e contratos

| Documento/definição | Situação | Aprova/valida | Limite | Fonte |
|---|---|---|---|---|
| Política de privacidade | **A ELABORAR E VALIDAR** | Spark + Jurídico | antes de dados reais | GOVERNANCA |
| Termos de uso | **A ELABORAR E VALIDAR** | Spark + Jurídico | antes do primeiro cliente | GOVERNANCA |
| Contrato com tenant | **A ELABORAR E VALIDAR** | Spark + Jurídico | antes do primeiro cliente | GOVERNANCA |
| Cláusulas de tratamento de dados por operação | **A ELABORAR E VALIDAR** | Spark + Jurídico | antes do primeiro cliente | PP-004 |
| Contrato do provedor de hospedagem | **A VALIDAR** | Spark + Jurídico | antes da contratação | GOVERNANCA |
| Contrato do provedor de banco/backup | **A VALIDAR** | Spark + Jurídico | antes da contratação | PP-007 |
| Contrato do Sentry | **A VALIDAR** | Spark + Jurídico | antes da contratação | PP-008 |
| Contrato do BetterStack | **A VALIDAR** | Spark + Jurídico | antes da contratação | PP-008 |
| Contrato do provedor de e-mail | **A VALIDAR** | Spark + Jurídico | antes da contratação | PP-015 |
| Lista de fornecedores que tratam dados | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Regras de compartilhamento de dados | **A DEFINIR** | Spark + Jurídico | antes de dados reais | GOVERNANCA |
| Revisão final de conformidade com a LGPD | **A REALIZAR** | Jurídico | antes de dados reais | GOVERNANCA |

## 3. Desenvolvedor

Estas definições são técnicas. Quando dependerem de política, fornecedor ou risco empresarial, só podem ser fechadas depois da decisão da Spark.

### Infraestrutura e acesso

| Definição técnica | Valor | Dependência | Limite | Fonte |
|---|---|---|---|---|
| Desenho dos ambientes de staging e produção | **2 ambientes no Railway: staging e produção — DEFINIDO** | ADR aprovado | implementar antes de staging privado | ADR-016/B10.0 |
| Sequência de implantação | **staging; validação manual; produção — DEFINIDA** | ADR aprovado | implementar antes de staging privado | ADR-016/B10.0 |
| Credencial exclusiva para atualização do banco | **A DEFINIR** | política de acesso aprovada | antes de staging privado | PP-005 |
| Credencial exclusiva para operação da aplicação | **A DEFINIR** | política de acesso aprovada | antes de staging privado | PP-005 |
| Permissões mínimas de cada credencial | **A DEFINIR E TESTAR** | política de acesso aprovada | antes de staging público | PP-005 |
| Processo de concessão e revogação de acesso | **A DEFINIR** | responsáveis aprovados | antes de staging privado | PP-005 |
| Configuração de conexão segura | **A DEFINIR E TESTAR** | provedor aprovado | antes de staging público | B10.1 |
| Configuração de cookies e headers por ambiente | **A DEFINIR E TESTAR** | domínios aprovados | antes de staging público | B10.1 |

### Segredos e recuperação

| Definição técnica | Valor | Dependência | Limite | Fonte |
|---|---|---|---|---|
| Processo de armazenamento dos segredos | **A DEFINIR** | cofre aprovado | antes de staging privado | PP-006 |
| Frequência e procedimento de troca de chaves | **A DEFINIR** | política aprovada | antes de staging público | PP-006 |
| Procedimento de revogação por comprometimento | **A DEFINIR** | responsáveis aprovados | antes de staging público | PP-006 |
| Procedimento de recuperação após comprometimento | **A DEFINIR** | responsáveis aprovados | antes de staging público | PP-006 |
| Frequência técnica de backup | **no máximo 1 hora — DERIVADA DO RPO** | RPO de 1 hora aprovado | antes de staging privado | ADR-016/PP-007 |
| Procedimento de restauração | **A DEFINIR E ENSAIAR** | RTO aprovado | antes de produção | PP-007 |
| Procedimento para falha de atualização do banco | **A DEFINIR E ENSAIAR** | estratégia aprovada | antes de produção | PP-007 |
| Monitoramento de falha de backup | **A DEFINIR E TESTAR** | serviço aprovado | antes de produção | PP-007 |

### Privacidade e retenção

| Definição técnica | Valor | Dependência | Limite | Fonte |
|---|---|---|---|---|
| Agenda do job de encerramento de tenant | **A DEFINIR** | matriz validada | antes de dados reais | PP-004 |
| Mecanismo de exclusão, anonimização ou retenção legal após 60 dias | **A DEFINIR E TESTAR** | regras jurídicas validadas | antes de dados reais | PP-004 |
| Agenda do mecanismo de retenção de auditoria | **A DEFINIR** | exceções validadas | antes de dados reais | PP-004 |
| Mecanismo de encerramento da retenção de auditoria após 1 ano | **A DEFINIR E TESTAR** | exceções validadas | antes de dados reais | PP-004 |
| Mecanismo de anonimização de participante | **A DEFINIR E TESTAR** | dados preserváveis validados | antes de dados reais | PP-004 |
| Mecanismo de localização dos dados do titular | **A DEFINIR E TESTAR** | matriz validada | antes de dados reais | PP-004 |
| Formato técnico de exportação | **A DEFINIR** | formato aprovado | antes de dados reais | PP-004 |
| Auditoria dos fluxos de direitos do titular | **A DEFINIR E TESTAR** | procedimento aprovado | antes de dados reais | PP-004 |

### Monitoramento, e-mail, segurança e qualidade

| Definição técnica | Valor | Dependência | Limite | Fonte |
|---|---|---|---|---|
| Eventos que geram alerta | **A DEFINIR** | cobertura aprovada | antes de staging público | PP-008 |
| Limites de disparo dos alertas | **A DEFINIR** | cobertura aprovada | antes de staging público | PP-008 |
| Campos proibidos em logs e monitoramento | **A DEFINIR E VALIDAR** | matriz jurídica validada | antes de staging público | PP-008/PP-004 |
| Procedimento técnico de incidente | **A DEFINIR E ENSAIAR** | responsáveis aprovados | antes de produção | PP-008 |
| Política técnica de novas tentativas de e-mail | **1 reenvio após 30 minutos — DEFINIDA; implementar e testar** | ADR aprovado | antes do primeiro cliente | ADR-016/PP-015 |
| Tratamento técnico de e-mail devolvido | **após nova falha, notificar admin do tenant — DEFINIDO; implementar e testar** | ADR aprovado | antes do primeiro cliente | ADR-016/PP-015 |
| Monitoramento de falhas de entrega | **A DEFINIR E TESTAR** | provedor aprovado | antes do primeiro cliente | PP-015 |
| Solução para automação adicional de segurança | **A DEFINIR OU DOCUMENTAR MITIGAÇÃO** | decisão da Spark | antes do release | PP-014 |
| Plano compatível para eliminar alertas de dependências | **A DEFINIR QUANDO HOUVER VERSÕES SEGURAS** | disponibilidade dos fornecedores | antes do release, salvo aceite formal | PP-016 |
| Escopo final dos testes de interface em staging | **A DEFINIR E VERSIONAR** | ambiente disponível | antes do release | PP-009/B10.4 |
| Matriz técnica de dispositivos e navegadores | **A DEFINIR** | escopo de acessibilidade aprovado | antes do release | PP-010 |

### Critérios e evidências de release

| Definição técnica | Valor | Dependência | Limite | Fonte |
|---|---|---|---|---|
| Checklist técnico de staging | **A DEFINIR** | critérios empresariais aprovados | antes de staging público | B10.5 |
| Checklist técnico de produção | **A DEFINIR** | critérios empresariais aprovados | antes de produção | B10.5 |
| Evidências exigidas para implantação | **A DEFINIR** | gates B10.0–B10.4 | antes de produção | B10.5 |
| Procedimento de smoke test após implantação | **A DEFINIR** | ambiente aprovado | antes de produção | B10.5 |
| Procedimento técnico de go/no-go | **A DEFINIR** | aprovador indicado | antes de produção | B10.5 |

## 4. Operação futura

| Definição | Valor | Aprova | Limite | Fonte |
|---|---|---|---|---|
| Escala de acompanhamento de alertas | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Registro de incidentes | **A DEFINIR** | Direção da Spark | antes de staging público | PP-008 |
| Registro de solicitações de titulares | **A DEFINIR** | Spark + Jurídico | antes de dados reais | PP-004 |
| Registro de concessão e revogação de acessos | **A DEFINIR** | Direção da Spark | antes de staging privado | PP-005 |
| Calendário de revisão de acessos | **A DEFINIR** | Direção da Spark | antes de produção | PP-005 |
| Calendário de teste de restauração | **A DEFINIR** | Direção da Spark | antes de produção | PP-007 |
| Calendário de troca de segredos | **A DEFINIR** | Direção aprova proposta técnica | antes de produção | PP-006 |
| Acompanhamento de entrega de e-mails | **A DEFINIR** | Direção da Spark | antes do primeiro cliente | PP-015 |
| Processo de suporte ao cliente | **A DEFINIR** | Direção da Spark | antes do primeiro cliente | GOVERNANCA |
| Guarda das evidências de aprovação de release | **A DEFINIR** | Direção da Spark | antes de produção | B10.5 |

## 5. Decisões já aprovadas — não redefinir

| Tema | Decisão vigente | Pendência remanescente |
|---|---|---|
| Papel dos agentes de tratamento | definido por operação e contrato; não existe classificação global | preencher matriz e validar juridicamente |
| Retenção após encerramento do tenant | até 60 dias | validar exceções e implementar destino final |
| Retenção de registros de auditoria | 1 ano, salvo obrigação legal ou contratual diferente | validar exceções e implementar mecanismo |
| Exclusão de participante | anonimização quando juridicamente permitida | definir dados mínimos preserváveis e implementar |
| Declaração completa de acesso | até 15 dias quando o prazo legal for aplicável | validar procedimento e responsáveis |
| Canal do titular | `privacidade@sparkinteligencia.com.br` | designar responsáveis e operar o canal |
| Sessão autenticada | limite absoluto de 30 dias | nenhuma decisão empresarial pendente registrada |
| Convite | validade de 72 horas | nenhuma decisão empresarial pendente registrada |
| Hospedagem e banco do MVP | Railway com PostgreSQL | implementar e validar staging |
| Backups | Cloudflare R2, retenção de 90 dias e cópia externa | validar juridicamente e implementar |
| Recuperação | RPO de 1 hora e RTO de 4 horas | implementar e ensaiar |
| Segredos no MVP | Railway Environment Variables | implementar e ensaiar comprometimento |
| Monitoramento do MVP | OpenTelemetry, Sentry e BetterStack, com responsabilidades separadas | contratar, implementar, testar e criar runbook |
| E-mail transacional | Resend; 1 reenvio após 30 minutos | validar contrato, registrar domínio e implementar |
| Cobertura operacional | segunda a sábado, 8h–20h; reconhecimento em 30 minutos | definir responsáveis e início da resposta |
| Suporte no MVP | e-mail da Spark; primeira resposta em até 2 dias úteis; sem SLA de disponibilidade | operar e revisar antes de cliente enterprise |
| Ambientes | staging e produção no Railway; staging primeiro e produção após validação manual | implementar e definir gates formais |

## 6. Trabalhos pendentes sem definição adicional

Não exigem nova decisão para começar; exigem execução pelo Desenvolvedor:

- remover o armazenamento local restante de tracker e ritual — PP-002;
- versionar os testes completos da interface — PP-009;
- concluir reporting, integração final da interface e administração conforme o roadmap;
- executar as automações, testes, ensaios e documentação após as definições deste checklist.

## 7. Fora do escopo atual

Não definir sem nova decisão explícita de produto:

- customização de programas por cliente;
- cobrança e faturamento;
- inteligência artificial;
- microserviços e filas externas;
- editor de gamificação;
- notificações avançadas;
- relatórios analíticos avançados;
- aplicativo móvel nativo.

## 8. Registro da decisão

Para cada campo preenchido, registrar:

- **decisão:**
- **data:**
- **decidido por:**
- **aprovado por:**
- **validado juridicamente por, quando aplicável:**
- **documento ou contrato de evidência:**
- **PP, fase ou gate afetado:**
- **responsável pela implementação:**
- **prazo de implementação:**
