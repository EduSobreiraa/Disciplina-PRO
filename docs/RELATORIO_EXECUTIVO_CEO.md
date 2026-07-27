# Relatório executivo de decisões pendentes

> **Destinatário:** Joval Lacerda, CEO da Spark Inteligência Corporativa  
> **Projeto:** Disciplina PRO  
> **Data da auditoria:** 26/07/2026  
> **Escopo:** problemas postergados que exigem decisão ou aprovação da Direção da Spark

## 1. Resumo executivo

O Disciplina PRO pode continuar em desenvolvimento local, mas ainda não está autorizado para receber dados ou usuários reais, operar em staging público ou entrar em produção. Este relatório apresenta somente os problemas em que uma decisão empresarial da Spark é necessária. Questões que o Desenvolvedor pode resolver sozinho foram excluídas.

Há nove problemas que exigem participação da Direção:

- **PP-004:** governança de dados pessoais, retenção e atendimento ao titular;
- **PP-005:** separação dos acessos ao banco de dados;
- **PP-006:** guarda e rotação de chaves e segredos;
- **PP-007:** continuidade do negócio, backup e recuperação;
- **PP-008:** monitoramento e resposta a incidentes;
- **PP-010:** validação real de acessibilidade;
- **PP-014:** automação adicional de segurança;
- **PP-015:** contratação do serviço de e-mail transacional;
- **PP-016:** tratamento de alertas de segurança em dependências.

As decisões do PP-004 descritas como aprovadas neste relatório já pertencem à política da Spark. Elas não devem ser reenviadas ao CEO como se ainda estivessem em aberto. O que falta é formalização jurídica, complementação da matriz de tratamento e implementação técnica.

## 2. Decisões que bloqueiam dados reais ou staging

### PP-004 — Governança de dados pessoais, retenção e atendimento ao titular

**O que é:** conjunto de regras para definir por quanto tempo os dados permanecem no sistema, o que acontece após cancelamento ou pedido de exclusão, como a Spark atende o titular e como se define o papel de cada empresa no tratamento dos dados.

**Por que existe:** o sistema possui dados de empresas, participantes, auditoria e conteúdo privado. A tecnologia pode executar exclusão ou anonimização, mas não pode decidir sozinha quais dados devem ser preservados por obrigação legal, contratual ou empresarial.

**Risco para a Spark:** retenção excessiva, exclusão indevida, resposta inadequada ao titular, contratos incompatíveis com a operação real e exposição regulatória ou reputacional.

**O que já foi decidido pela Spark:**

- não haverá classificação global da Spark como controladora ou operadora;
- controlador, operador ou controladoria conjunta serão definidos por operação de tratamento e por contrato com cada tenant;
- após o encerramento de um tenant, haverá retenção operacional por até 60 dias;
- depois desse prazo, será aplicada exclusão, anonimização ou retenção legal;
- `AuditEvent` será retido por 1 ano, salvo obrigação legal ou contratual diferente;
- quando juridicamente permitido, dados pessoais do participante serão anonimizados, preservando somente o necessário para auditoria, obrigações legais, estatísticas e integridade histórica;
- solicitações de titulares terão confirmação e declaração completa em até 15 dias quando esse prazo for aplicável pela legislação;
- demais solicitações seguirão política interna da Spark e requisitos legais;
- SLA interno diferente será tratado como meta operacional, não como prazo legal;
- [privacidade@sparkinteligencia.com.br](mailto:privacidade@sparkinteligencia.com.br) é o canal oficial, administrado pela Spark.

**Decisões ou aprovações ainda necessárias:**

- aprovar formalmente a matriz definitiva de operações, categorias de dados, finalidades e responsáveis;
- definir, com validação jurídica, bases legais, exceções de retenção, compartilhamentos e conteúdo mínimo que poderá ser preservado;
- aprovar política de privacidade, termos, contratos com tenants e contratos de provedores;
- definir responsáveis internos pelo recebimento, análise, resposta e comprovação das solicitações;
- aprovar o procedimento operacional do canal oficial.

**Recomendação:** contratar ou designar assessoria jurídica com experiência em LGPD para revisar a matriz e os instrumentos antes do uso com dados reais. A Direção deve nomear internamente o responsável pelo processo de privacidade e aprovar um fluxo operacional documentado. Essa recomendação não altera as políticas já aprovadas.

**Momento:** validação jurídica e aprovação formal antes de qualquer staging com dados pessoais reais; mecanismos e documentos concluídos antes de produção.

**Responsabilidade do Desenvolvedor após a aprovação:** implementar e testar jobs automáticos, confirmação de solicitações, localização, acesso, correção, exportação, anonimização e exclusão; registrar evidências e auditoria sem decidir bases legais ou exceções.

### PP-005 — Separação dos acessos ao banco de dados

**O que é:** atualmente, o ambiente local utiliza um acesso ao banco com poderes amplos tanto para atualizar sua estrutura quanto para executar a aplicação.

**Por que existe:** essa configuração simplifica o desenvolvimento, mas não é adequada para um ambiente empresarial hospedado. A separação depende do provedor e do desenho operacional escolhidos para staging e produção.

**Risco para a Spark:** uma falha ou invasão da aplicação poderia permitir alterações ou destruição de dados além do necessário para sua operação normal.

**Decisão necessária:** escolher o ambiente/provedor de banco e aprovar a separação entre credenciais de atualização estrutural e credenciais de operação diária, incluindo quem terá acesso administrativo.

**Recomendação:** exigir credenciais separadas e acesso administrativo restrito desde o primeiro staging compartilhado, sem aceitar uma conta única em produção.

**Momento:** decisão durante o desenho de staging; implementação obrigatória antes de staging público e produção.

**Responsabilidade do Desenvolvedor após a aprovação:** configurar os acessos, restringir privilégios, automatizar o uso correto em deploy e comprovar que a aplicação não consegue executar operações administrativas.

### PP-006 — Guarda e rotação de chaves e segredos

**O que é:** o sistema usa chaves e segredos para proteger sessões e convites. Em desenvolvimento eles ainda não possuem cofre corporativo, responsáveis e procedimento completo de troca ou comprometimento.

**Por que existe:** a solução definitiva depende da infraestrutura contratada e das regras internas de acesso da Spark.

**Risco para a Spark:** vazamento de sessões, acesso indevido, interrupção do serviço ou incapacidade de reagir rapidamente ao comprometimento de uma chave.

**Decisão necessária:** escolher e contratar o serviço de gestão de segredos; definir quem pode acessar, autorizar rotação e responder a comprometimentos.

**Recomendação:** utilizar o gerenciador de segredos nativo do provedor de hospedagem quando ele atender aos controles exigidos, reduzindo fornecedores e complexidade operacional. A escolha deve considerar acesso restrito, histórico, rotação e recuperação.

**Momento:** junto da contratação da infraestrutura de staging; obrigatório antes de qualquer staging público.

**Responsabilidade do Desenvolvedor após a aprovação:** integrar o cofre, retirar material permanente das configurações locais, implementar rotação e executar um ensaio documentado de comprometimento e recuperação.

### PP-007 — Backup, restauração e continuidade

**O que é:** o banco pode ser criado do zero, mas ainda não há backup automático contratado, restauração ensaiada nem metas empresariais de perda aceitável de dados e tempo de recuperação.

**Por que existe:** essas metas não são apenas técnicas. Elas dependem do impacto que uma indisponibilidade ou perda de dados teria para clientes e para a Spark.

**Risco para a Spark:** perda permanente de dados, indisponibilidade prolongada, descumprimento contratual e recuperação improvisada durante um incidente.

**Decisão necessária:** definir RPO — quanto dado a empresa aceita perder — e RTO — quanto tempo aceita ficar indisponível —, além de aprovar custo, retenção e localização dos backups.

**Recomendação:** adotar metas conservadoras compatíveis com o MVP B2B e revisar custo versus impacto antes da contratação. Nenhuma meta numérica deve ser presumida pelo Desenvolvedor; ela precisa de aprovação explícita da Direção.

**Momento:** definição no planejamento de staging; backup e restauração comprovados antes de produção.

**Responsabilidade do Desenvolvedor após a aprovação:** configurar automação, monitorar backups, documentar recuperação e ensaiar restauração e tratamento de falha em atualização do banco.

### PP-008 — Monitoramento e resposta a incidentes

**O que é:** existem registros técnicos e verificação básica de saúde, mas ainda não há serviço contratado para centralizar erros, alertas, responsáveis de plantão e procedimento empresarial de incidente.

**Por que existe:** o desenvolvimento local não exige operação contínua. Staging e produção exigem definição de serviço, cobertura, responsáveis e canais de escalonamento.

**Risco para a Spark:** falhas, ataques ou vazamentos podem demorar a ser percebidos; clientes podem descobrir um incidente antes da empresa; informações sensíveis podem ser expostas em ferramentas de monitoramento mal configuradas.

**Decisão necessária:** escolher o nível de cobertura, responsáveis internos, canal de escalonamento e provedor de monitoramento; aprovar o procedimento de comunicação e resposta.

**Recomendação:** iniciar com cobertura dos fluxos críticos, alertas acionáveis e responsável nominal, evitando uma operação complexa que a equipe não consiga sustentar. Revisar contratualmente qualquer provedor que receba dados do sistema.

**Momento:** decisão antes de staging público; alertas e resposta ensaiados antes de produção.

**Responsabilidade do Desenvolvedor após a aprovação:** integrar monitoramento, remover dados sensíveis dos registros, configurar alertas, criar runbook técnico e participar do ensaio de incidente.

## 3. Decisões necessárias antes do release

### PP-010 — Validação real de acessibilidade

**O que é:** a interface foi verificada em diferentes tamanhos de tela, mas ainda não foi validada por pessoas usando leitor de tela, navegação por teclado e dispositivos físicos representativos.

**Por que existe:** testes automatizados e navegador de desenvolvimento não reproduzem integralmente as barreiras encontradas por pessoas com deficiência.

**Risco para a Spark:** exclusão de usuários, experiência inadequada, retrabalho tardio, dano reputacional e possível exposição jurídica.

**Decisão necessária:** definir o nível de conformidade e o critério empresarial de aceite; decidir se a validação será interna ou contratada e quais perfis e dispositivos serão contemplados.

**Recomendação:** contratar uma avaliação focada nos fluxos críticos do MVP e incluir pessoas que utilizem tecnologia assistiva, registrando problemas por severidade e bloqueando o release quando impedirem o uso essencial.

**Momento:** contratação e planejamento durante staging; validação e correções antes de produção. Melhorias não críticas podem ser planejadas para pós-MVP somente mediante aceite formal da Spark e avaliação jurídica quando aplicável.

**Responsabilidade do Desenvolvedor após a aprovação:** preparar o ambiente, apoiar a avaliação, corrigir barreiras técnicas e produzir evidências de regressão.

### PP-014 — Automação adicional de segurança

**O que é:** ferramentas automáticas de análise de segurança e atualização de dependências foram retiradas devido a limitações observadas no plano ou no repositório privado. Existem controles substitutos, mas com mais trabalho manual.

**Por que existe:** a disponibilidade depende do plano contratado e das funcionalidades oferecidas ao repositório.

**Risco para a Spark:** alertas ou atualizações importantes podem ser identificados mais tarde, aumentando a dependência de verificações manuais.

**Decisão necessária:** aprovar eventual mudança de plano ou uma ferramenta equivalente e aceitar formalmente o risco residual caso a automação permaneça limitada.

**Recomendação:** comparar o custo da funcionalidade nativa com uma alternativa compatível e habilitar uma solução que não duplique nem enfraqueça os controles existentes.

**Momento:** decisão antes do release; pode permanecer mitigado durante desenvolvimento e staging restrito, mas precisa de aceite explícito para produção.

**Responsabilidade do Desenvolvedor após a aprovação:** configurar a ferramenta escolhida, eliminar alertas duplicados ou conflitantes e comprovar sua execução no processo de entrega.

### PP-015 — Serviço de e-mail transacional

**O que é:** convites funcionam em ambiente local, mas a Spark ainda não selecionou o serviço que enviará e-mails reais.

**Por que existe:** a escolha envolve preço, reputação de envio, limites, suporte, tratamento de falhas, proteção de dados e contrato com fornecedor.

**Risco para a Spark:** usuários podem não receber convites, mensagens podem ser classificadas como spam, falhas podem passar despercebidas e dados podem ser tratados por fornecedor sem instrumento adequado.

**Decisão necessária:** selecionar e contratar provedor; definir remetente, domínio, volume previsto, SLA operacional e regras para falhas e devoluções; submeter o contrato e o tratamento de dados à validação jurídica.

**Recomendação:** realizar comparação curta entre provedores com boa entregabilidade, suporte a autenticação de domínio, tratamento de devoluções e mecanismos de privacidade. Executar um piloto em staging antes do compromisso de produção.

**Momento:** seleção antes de staging que dependa de e-mail real; contrato, integração validada e revisão jurídica antes de produção.

**Responsabilidade do Desenvolvedor após a aprovação:** integrar o provedor, proteger tokens de convite, implementar repetição controlada, tratar devoluções e configurar observabilidade e testes.

### PP-016 — Alertas de segurança nas dependências

**O que é:** a auditoria registra alertas em bibliotecas utilizadas para desenvolvimento e em uma biblioteca do frontend. Parte não está exposta na operação atual, e algumas correções sugeridas criariam regressões ou reduziriam versões.

**Por que existe:** fornecedores ainda não disponibilizaram combinações compatíveis que eliminem todos os alertas sem comprometer os testes e controles existentes.

**Risco para a Spark:** vulnerabilidades podem vir a afetar o produto, o processo de desenvolvimento ou a cadeia de entrega. Também existe risco de aplicar uma “correção” automática que torne o sistema menos seguro ou instável.

**Decisão necessária:** não há decisão técnica imediata que substitua a atualização segura. A Direção precisa definir se aceita temporariamente o risco residual para staging restrito e estabelecer que produção somente ocorrerá com a auditoria no nível aprovado ou com exceção empresarial formal, documentada e reavaliada.

**Recomendação:** manter o bloqueio de produção, acompanhar versões corrigidas e evitar downgrade ou substituição incompatível apenas para zerar o relatório. Qualquer exceção deve registrar escopo, justificativa, prazo de revisão e aceite da Direção.

**Momento:** acompanhamento contínuo; decisão formal no gate de staging e nova avaliação obrigatória antes de produção.

**Responsabilidade do Desenvolvedor após a aprovação:** atualizar dependências de forma compatível, executar regressões, documentar exposição real e apresentar evidências para a reavaliação do risco.

## 4. Sequência recomendada para a Direção

Sem criar novos prazos ou políticas, a ordem sugerida pelos gates já documentados é:

1. **Antes de staging com dados reais:** concluir PP-004 e decidir PP-005, PP-006, PP-007 e PP-008.
2. **Antes de staging dependente de e-mail real:** selecionar o provedor do PP-015.
3. **Durante staging:** ensaiar recuperação, incidentes, e-mail e acessibilidade; reavaliar o PP-016.
4. **Antes de produção:** aprovar as evidências de PP-004–PP-008, PP-010, PP-014, PP-015 e PP-016, sem transferir o aceite empresarial ao Desenvolvedor.
5. **Pós-MVP:** somente melhorias expressamente classificadas como não bloqueantes após os gates anteriores; nenhuma obrigação jurídica, de proteção de dados ou recuperação pode ser adiada por conveniência técnica.

## 5. Problemas incluídos e excluídos

### Incluídos — exigem decisão ou aprovação da Spark

| Problema | Participação exigida |
|---|---|
| PP-004 | política e aprovação da Spark, validação jurídica e implementação técnica |
| PP-005 | escolha de ambiente, governança de acesso e aceite empresarial |
| PP-006 | contratação de cofre e definição de responsáveis |
| PP-007 | definição de RPO/RTO, custo e aceite de continuidade |
| PP-008 | cobertura operacional, responsáveis, provedor e resposta |
| PP-010 | critério de aceite e contratação/coordenação da validação humana |
| PP-014 | decisão de plano/ferramenta ou aceite do risco residual |
| PP-015 | seleção e contratação de provedor, SLA e validação jurídica |
| PP-016 | aceite temporário de risco e decisão de go/no-go |

### Excluídos — podem ser resolvidos exclusivamente pelo Desenvolvedor

| Problema | Motivo da exclusão |
|---|---|
| PP-001 | autenticação e autorização; já encerrado tecnicamente |
| PP-002 | substituição da persistência local por mecanismos server-side |
| PP-003 | isolamento multi-tenant; já encerrado tecnicamente |
| PP-009 | criação da suíte E2E frontend |
| PP-011 | pisos técnicos de cobertura; já encerrado |
| PP-012 | atualização técnica de dependência; já encerrado |
| PP-013 | fixação segura da ferramenta de análise; já encerrado |
| PP-017 | reconciliação técnica de CORS; já encerrado |

## 6. Fontes e limite deste relatório

Este relatório deriva de:

- [`../GOVERNANCA.md`](../GOVERNANCA.md);
- [`PROBLEMAS_POSTERGADOS.md`](PROBLEMAS_POSTERGADOS.md);
- [`ROADMAP.md`](ROADMAP.md);
- [`../ARQUITETURA.md`](../ARQUITETURA.md);
- [`adr/003-lifecycle-exclusao-retencao.md`](adr/003-lifecycle-exclusao-retencao.md);
- [`adr/015-eventos-internos-gamificacao-auditoria.md`](adr/015-eventos-internos-gamificacao-auditoria.md).

As recomendações são orientações executivas para decisão e não constituem parecer jurídico, aprovação comercial ou alteração das decisões arquiteturais existentes.
