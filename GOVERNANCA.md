# Governança do Disciplina PRO

> Spark Inteligência Corporativa · Decisão aprovada em 26/07/2026

## 1. Objetivo e autoridade

Este documento separa responsabilidades técnicas, empresariais e jurídicas. Ele não substitui ADRs, contratos ou pareceres jurídicos. Em caso de conflito, prevalece a ordem de autoridade registrada no processo de documentação do projeto: decisões aprovadas pelo proprietário com o arquiteto, ADRs aprovados e, em seguida, este documento.

Nenhuma decisão empresarial, comercial ou jurídica é atribuída implicitamente ao Desenvolvedor. O Desenvolvedor implementa tecnicamente decisões aprovadas, sem definir por conta própria políticas, contratos, preços, SLA, bases legais ou aceite de risco empresarial.

## 2. Matriz geral de responsabilidades

| Tema | Desenvolvedor | Direção da Spark | Validação jurídica futura |
|---|---|---|---|
| Implementação e arquitetura técnica | Eduardo implementa, documenta e produz evidências técnicas | acompanha riscos empresariais e contratações aprovadas | não aplicável, salvo impacto regulatório identificado |
| Migrations, APIs, autenticação, autorização e segurança técnica | projeta e implementa conforme arquitetura aprovada | aceita riscos empresariais residuais | valida requisitos legais quando aplicável |
| Infraestrutura, backup, restore, observabilidade e automações | implementa, opera tecnicamente e ensaia | escolhe/contrata provedores, define RPO/RTO e aprova operação | valida contratos e tratamento de dados por provedores quando aplicável |
| Retenção, exclusão e anonimização | implementa jobs e mecanismos aprovados | define e aprova a política | valida bases, obrigações e exceções legais |
| Contratos, termos, política de privacidade e SLA | fornece subsídios técnicos | define e aprova condições empresariais e operacionais | revisa e valida os instrumentos |
| Atendimento ao titular e canal oficial | implementa mecanismos de confirmação, busca, correção, exportação, anonimização ou exclusão | administra o canal, responde ao titular e define o processo interno | valida enquadramento, conteúdo e prazos aplicáveis |
| Papéis dos agentes de tratamento | documenta e implementa controles após definição | negocia e aprova contratos com cada tenant | valida a classificação por operação de tratamento |
| Preços, condições comerciais e contratação | não decide | decide e aprova | valida instrumentos quando aplicável |
| Produção e releases | Eduardo prepara candidato, executa testes de staging, decide tecnicamente o go/no-go, realiza o deploy e registra evidências por e-mail | delibera apenas sobre risco empresarial, comercial ou contratação que ultrapasse a operação técnica delegada | valida conformidade final quando exigida |

## 3. Governança de privacidade e do PP-004

### 3.1 Papéis dos agentes de tratamento

Não existe classificação global para o Disciplina PRO. Os papéis de controlador, operador ou controladoria conjunta serão definidos por operação de tratamento, conforme a LGPD e os contratos firmados entre a Spark e cada tenant.

A Spark decide e formaliza a relação contratual. A classificação deverá constar futuramente na documentação jurídica e contratual, após validação jurídica. O Desenvolvedor somente implementa os controles técnicos decorrentes da definição aprovada.

### 3.2 Políticas aprovadas

| Operação/categoria | Política da Spark | Implementação técnica | Pendência jurídica |
|---|---|---|---|
| Cancelamento de tenant | retenção operacional por até 60 dias após o encerramento; depois, exclusão, anonimização ou retenção legal conforme política aprovada | job automatizado, idempotente, observável, auditado e testado | validar hipóteses de retenção legal e refletir a regra nos contratos/documentos jurídicos |
| `AuditEvent` | retenção de 1 ano, salvo obrigação legal ou contratual diferente | mecanismo de retenção implementado pelo Desenvolvedor | validar exceções legais/contratuais |
| Exclusão de participante | quando juridicamente permitido, anonimizar dados pessoais e preservar apenas o necessário para auditoria, obrigações legais, estatísticas e integridade histórica | fluxo autorizado e mecanismo de anonimização/exclusão | validar permissões, bases, exceções e conteúdo mínimo preservável |
| Atendimento ao titular | a Spark administra o processo e o canal oficial | mecanismos técnicos para localizar, confirmar, corrigir, exportar, anonimizar ou excluir | validar o procedimento e sua aderência final à LGPD |

### 3.3 Atendimento ao titular

O canal oficial é [privacidade@sparkinteligencia.com.br](mailto:privacidade@sparkinteligencia.com.br), administrado pela Spark.

O procedimento deve registrar:

- confirmação da solicitação;
- declaração completa em até 15 dias, quando esse prazo for aplicável pela legislação;
- demais solicitações conforme a política interna da Spark e os requisitos legais.

Qualquer SLA interno diferente deve ser identificado como meta operacional da Spark, nunca como prazo legal. A resposta, sua linguagem e o enquadramento de cada solicitação dependem de validação jurídica futura.

## 4. Artefatos jurídicos ainda não concluídos

Permanecem pendentes e não podem ser apresentados como aprovados ou concluídos:

- política de privacidade;
- termos de uso;
- contratos com tenants e provedores;
- matriz definitiva de operações de tratamento, finalidades e bases legais;
- regras de compartilhamento de dados;
- classificação dos agentes por operação de tratamento;
- revisão final de conformidade LGPD e dos direitos do titular.

## 5. Aprovação, evidência e encerramento

- o Desenvolvedor comprova implementação por código, testes, automações, runbooks e evidências operacionais;
- a Direção da Spark comprova decisões empresariais por aprovação formal, política, contrato, escolha de provedor ou registro de go/no-go;
- a validação jurídica é comprovada por documento revisado/aprovado pela assessoria competente;
- um PP só pode ser encerrado quando todas as evidências exigidas em [`docs/PROBLEMAS_POSTERGADOS.md`](docs/PROBLEMAS_POSTERGADOS.md) existirem;
- atualização documental, isoladamente, não prova implementação nem validação jurídica.

## 6. Histórico

| Data | Decisão |
|---|---|
| 26/07/2026 | Separadas as responsabilidades do Desenvolvedor, da Direção da Spark e de validação jurídica futura. |
| 26/07/2026 | Aprovadas as políticas do PP-004 para classificação por operação, cancelamento de tenant, `AuditEvent`, exclusão de participante, atendimento ao titular e canal oficial. |
| 03/08/2026 | O proprietário do projeto aprovou no ADR 016 fornecedores e parâmetros operacionais do MVP; validações jurídicas, escolhas explicitamente abertas e evidências de implementação continuam pendentes. |
| 03/08/2026 | BetterStack definido para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais; Sentry mantido para exceções, stack traces e performance; OpenTelemetry mantido como instrumentação. |
| 21/08/2026 | Eduardo definido como único responsável técnico-operacional: código, infraestrutura, banco, segredos, staging, produção, monitoramento, incidentes técnicos e aprovação técnica de release. Testes de staging, decisões de release e comunicações operacionais são registrados por e-mail; não há substituto técnico no momento. |
| 21/08/2026 | Canal interno de incidentes definido como grupo privado do Telegram com Bot API. Eduardo é, por ora, o único operador e coordenador; alertas não devem conter dados pessoais, tokens, respostas privadas ou conteúdo de clientes. Início da resposta: até 2 horas após o reconhecimento. |
