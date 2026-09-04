# Decisões executivas para staging e lançamento

## 1. Capa

- **Projeto:** Disciplina PRO
- **Destinatário:** Joval Lacerda, CEO
- **Empresa:** Spark Inteligência Corporativa
- **Data:** 3 de agosto de 2026
**Finalidade:** apresentar somente os riscos e decisões que dependem da Direção da Spark, de contratação, de aceite empresarial ou de validação jurídica.

Este relatório não solicita ao CEO decisões que pertencem exclusivamente ao trabalho do Desenvolvedor. Recomendações não representam aprovação, contratação ou parecer jurídico.

## 2. Resumo executivo

O Disciplina PRO pode continuar em desenvolvimento e validação local. Entretanto, ainda não há evidência suficiente para receber dados reais de empresas ou participantes, abrir um ambiente público de testes ou lançar o produto.

A auditoria identificou **dez temas executivos**: nove problemas postergados que exigem participação da Spark e uma decisão transversal de autorização de staging e produção. Os temas mais urgentes são:

- formalização jurídica das decisões de privacidade já aprovadas;
- implementação das metas aprovadas de perda de dados e recuperação;
- definição das regras de acesso sobre a infraestrutura já escolhida;
- definição de responsáveis por incidentes e pelo canal de privacidade;
- validação, contratação e implementação dos fornecedores escolhidos.

Antes de um ambiente público de testes, a Spark precisa aprovar a governança de dados, os acessos de produção, a custódia de chaves, a continuidade, o monitoramento e os responsáveis operacionais. Antes do primeiro cliente e do lançamento, também precisam estar resolvidos o serviço de e-mail, a validação humana de acessibilidade, os riscos de segurança residuais e o procedimento formal de autorização.

A automação adicional de segurança é o único tema que pode permanecer mitigado por mais tempo, desde que a Direção aceite formalmente o risco residual antes do lançamento. O ADR 016 decidiu que não haverá SLA contratual de disponibilidade no MVP, com revisão antes do primeiro cliente enterprise. Também aprovou RPO de 1 hora, RTO de 4 horas, Railway, Cloudflare R2, Resend, OpenTelemetry para instrumentação, Sentry para exceções/performance, BetterStack para disponibilidade e parâmetros iniciais de suporte e operação.

As principais regras do PP-004 já foram decididas pela Spark. Elas não estão sendo submetidas novamente à escolha do CEO. Ainda faltam formalização, revisão jurídica, definição de responsáveis internos e implementação.

## 3. Como interpretar as prioridades

**Bloqueia uso com dados reais:** o produto não deve receber informações reais de empresas ou participantes enquanto a pendência permanecer.

**Antes de staging privado:** a decisão deve existir antes de criar um ambiente restrito, usado pela equipe ou por convidados controlados.

**Antes de staging público:** a decisão e seus controles devem existir antes de abrir o ambiente de testes para público externo.

**Antes do primeiro cliente:** contratos, atendimento, operação e proteção de dados devem estar coerentes antes de assumir compromisso com uma empresa cliente.

**Antes do release:** a Direção precisa revisar as evidências e autorizar expressamente o lançamento.

**Após o MVP:** somente melhorias que não sejam obrigação jurídica, proteção essencial ou condição de operação podem ser adiadas para depois da primeira versão.

## 4. Problemas que exigem decisão da Spark

### Governança de dados pessoais e atendimento ao titular — PP-004

**O que é**

É o conjunto de regras que define por quanto tempo os dados permanecem no Disciplina PRO, o que acontece após cancelamento ou pedido de exclusão, como a Spark atende uma pessoa que solicita seus dados e qual é o papel de cada empresa no tratamento dessas informações.

**Por que este problema existe**

O produto tratará dados de empresas, participantes, registros históricos e conteúdo privado. Parte da política já foi aprovada, mas a tecnologia não pode determinar bases legais, exceções, contratos ou responsabilidades entre a Spark e cada cliente.

**Qual é o risco para a Spark**

Sem formalização, a empresa pode manter dados por tempo excessivo, excluir informações que deveria preservar, responder inadequadamente a titulares ou assinar contratos incompatíveis com a operação real. Isso cria riscos jurídicos, reputacionais e comerciais.

**O que já foi feito**

A Spark já aprovou os prazos centrais, a anonimização quando juridicamente aplicável, o canal oficial e a definição dos papéis por operação e contrato. O sistema já separa conteúdo privado de informações usadas em relatórios e auditoria. Ainda não existem todos os mecanismos automáticos, documentos jurídicos e evidências operacionais.

**O que precisa ser decidido pelo CEO**

Aprovar formalmente a matriz final de tratamento de dados e o processo interno de atendimento; designar o responsável da Spark pelo canal de privacidade; autorizar o encaminhamento da política, contratos e termos para validação jurídica.

**Recomendação**

Manter as decisões já aprovadas e submetê-las a uma revisão jurídica única e coordenada. Nomear um responsável interno pelo processo de privacidade antes de permitir dados reais.

**Consequência da decisão**

A decisão gera trabalho jurídico, operacional e técnico antes da abertura externa, mas reduz o risco de retrabalho contratual e de tratamento inconsistente dos dados.

**Prazo de decisão**

**Agora.** A formalização bloqueia uso com dados reais e deve estar concluída antes de staging público e antes do primeiro cliente.

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar políticas, responsáveis internos, contratos e processo de atendimento.
- **Desenvolvedor:** implementar automações de retenção, consulta, correção, exportação, anonimização e exclusão; testar e documentar evidências.
- **Jurídico ou especialista externo:** validar bases legais, contratos, papéis por operação, exceções de retenção e direitos dos titulares.
- **Operação futura:** administrar o canal oficial, registrar solicitações, cumprir o procedimento e preservar evidências.

### Privilégios e acessos operacionais — PP-005

**O que é**

É a separação entre o acesso usado para fazer mudanças controladas no banco de dados e o acesso cotidiano usado pelo produto. Hoje o ambiente local utiliza um acesso mais amplo do que seria adequado fora do desenvolvimento.

**Por que este problema existe**

A configuração definitiva depende do ambiente hospedado, do fornecedor escolhido e de quem será autorizado a realizar ações administrativas.

**Qual é o risco para a Spark**

Uma falha ou acesso indevido poderia alcançar alterações ou destruição de dados além do necessário para operar o produto. A ausência de responsáveis claros também dificulta auditoria e resposta a incidentes.

**O que já foi feito**

O sistema possui proteções internas e registros históricos, mas elas não substituem a separação dos acessos no ambiente real.

**O que precisa ser decidido pelo CEO**

Aprovar a política de privilégio mínimo, indicar quem poderá ter acesso administrativo e autorizar que staging e produção usem credenciais separadas.

**Recomendação**

Restringir o acesso administrativo a pessoas expressamente autorizadas e exigir acessos separados desde o primeiro ambiente compartilhado.

**Consequência da decisão**

Haverá maior controle e rastreabilidade, com pequena elevação da complexidade operacional de implantação.

**Prazo de decisão**

**Antes de staging privado.**

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar a política de acesso e os responsáveis autorizados.
- **Desenvolvedor:** configurar os acessos, automatizar seu uso e comprovar que a operação diária não possui poderes administrativos.
- **Jurídico ou especialista externo:** revisar obrigações contratuais do fornecedor quando aplicável.
- **Operação futura:** conceder, revisar e revogar acessos conforme a política.

### Custódia de chaves e informações secretas — PP-006

**O que é**

O produto usa informações secretas para proteger sessões, convites e acessos. Fora do desenvolvimento, elas precisam ficar em um cofre corporativo, com acesso controlado e procedimento de troca.

**Por que este problema existe**

A solução depende da infraestrutura contratada e da definição de quem pode acessar ou autorizar a troca dessas informações.

**Qual é o risco para a Spark**

Uma exposição pode permitir acesso indevido ou interromper o serviço. Sem procedimento definido, a empresa pode demorar a reagir a um comprometimento.

**O que já foi feito**

Railway Environment Variables foi aprovado para o MVP. Ainda faltam responsáveis, configuração, procedimento de troca e ensaio de recuperação. Doppler ficou apenas para avaliação futura.

**O que precisa ser decidido pelo CEO**

Aprovar quem terá acesso e quem poderá autorizar troca, revogação e recuperação. O serviço do MVP já foi escolhido.

**Recomendação**

Preferir o cofre integrado ao provedor de hospedagem quando ele oferecer controle de acesso, histórico e recuperação adequados. Evitar manter segredos em arquivos ou contas pessoais.

**Consequência da decisão**

Pode haver custo do serviço e disciplina operacional adicional, em troca de menor risco de exposição e resposta mais rápida.

**Prazo de decisão**

**Antes de staging privado.**

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar responsáveis e política de acesso.
- **Desenvolvedor:** integrar o cofre, configurar a troca e executar um ensaio documentado de comprometimento.
- **Jurídico ou especialista externo:** revisar o contrato e eventual tratamento de dados pelo fornecedor.
- **Operação futura:** controlar acessos, autorizar trocas e acompanhar revisões periódicas.

### Continuidade, backup e recuperação — PP-007

**O que é**

É a definição de quanto dado a Spark aceita perder e por quanto tempo aceita ficar sem o sistema em um incidente. RPO é a quantidade máxima de dados que a empresa aceita perder. RTO é o tempo máximo aceitável para restabelecer o serviço.

**Por que este problema existe**

Esses limites dependem do impacto comercial e financeiro para a Spark e seus clientes. O Desenvolvedor pode criar backups, mas não pode definir sozinho quanto risco a empresa aceita nem quanto deseja investir em recuperação.

**Qual é o risco para a Spark**

Sem metas e testes, um incidente pode causar perda de dados, indisponibilidade prolongada, recuperação improvisada e descumprimento de compromissos assumidos com clientes.

**O que já foi feito**

Foram aprovados RPO de 1 hora, RTO de 4 horas, retenção de backups por 90 dias, cópia externa no Cloudflare R2 e rollback da aplicação somente quando o schema permanecer compatível; nos demais casos, aplica-se forward-fix. Em 30/08/2026, o laboratório comprovou o job diário Railway → R2, checksum e restauração local descartável, com 33 tabelas e dados fictícios recuperados. Em 01/09/2026, uma execução agendada comprovou novo dump timestampado, verificação dos dois objetos no R2 e heartbeat automático aceito pelo Better Stack. Ainda faltam PITR e restore dentro do Railway, ensaio de migration e aceite formal da evidência; os 90 dias dependem de validação jurídica.

**O que precisa ser decidido pelo CEO**

Aprovar o orçamento necessário para cumprir as metas, encaminhar a retenção de 90 dias ao Jurídico e aceitar as evidências do ensaio. RPO, RTO, localização e estratégia já foram decididos.

**Recomendação**

Implementar e comprovar as metas aprovadas antes de qualquer compromisso comercial. Revisá-las quando houver dados reais de custo e uso.

**Consequência da decisão**

Metas mais rigorosas reduzem perda e indisponibilidade, mas tendem a aumentar custo e exigência operacional. Metas menos rigorosas precisam ser compatíveis com os contratos e aceitas conscientemente.

**Prazo de decisão**

**Antes de staging privado** para orientar a infraestrutura; recuperação comprovada **antes do primeiro cliente**.

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar orçamento, evidências e compromissos empresariais.
- **Desenvolvedor:** configurar backups, monitorar sua execução, documentar e ensaiar recuperação.
- **Jurídico ou especialista externo:** verificar coerência entre metas, contratos e obrigações aplicáveis.
- **Operação futura:** acompanhar backups, responder a falhas e coordenar recuperações.

### Monitoramento e resposta a incidentes — PP-008

**O que é**

É a capacidade de perceber falhas ou ataques, alertar as pessoas responsáveis e seguir um procedimento conhecido até a recuperação e comunicação.

**Por que este problema existe**

O desenvolvimento local possui registros básicos, mas uma operação real depende de fornecedor, cobertura, responsáveis e canais de escalonamento definidos pela Spark.

**Qual é o risco para a Spark**

Falhas e ataques podem demorar a ser descobertos, clientes podem perceber o problema antes da empresa e informações sensíveis podem ser enviadas a uma ferramenta externa sem controles adequados.

**O que já foi feito**

OpenTelemetry foi definido para instrumentação; Sentry para exceções, stack traces e performance; Better Stack para uptime, heartbeats, disponibilidade, incidentes, status page e alertas operacionais. No laboratório, todos esses componentes estão operacionais. Em 03/09/2026, um drill controlado comprovou detecção de HTTP `404`, criação do incidente, alerta por e-mail, reconhecimento, diagnóstico e recuperação automática, sem interromper o sistema real nem expor dados sensíveis. Também foram aprovados cobertura de segunda a sábado das 8h às 20h, reconhecimento em até 30 minutos e início da resposta em até 2 horas; Eduardo é o único responsável técnico atual. Permanecem pendentes contas/canais corporativos e repetição do ensaio no staging oficial.

**O que precisa ser decidido pelo CEO**

Aprovar a contratação do BetterStack, os responsáveis, o canal final, o prazo para iniciar resposta e quem pode autorizar comunicação a clientes.

**Recomendação**

Começar com monitoramento dos fluxos críticos, alertas que tenham responsável nominal e um procedimento simples de incidente. Submeter o fornecedor à revisão contratual se ele receber dados do produto.

**Consequência da decisão**

Haverá custo de serviço e responsabilidade operacional contínua, com redução do tempo de detecção e resposta.

**Prazo de decisão**

**Antes de staging público.**

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar contratação, responsáveis e regras de comunicação.
- **Desenvolvedor:** integrar monitoramento, evitar exposição de dados sensíveis, configurar alertas e documentar o procedimento técnico.
- **Jurídico ou especialista externo:** revisar contrato, compartilhamento de dados e obrigações de comunicação.
- **Operação futura:** receber alertas, coordenar incidentes e manter registros.

### Acessibilidade com validação humana — PP-010

**O que é**

É a verificação do produto por pessoas usando teclado, leitor de tela e dispositivos físicos, além dos testes realizados automaticamente.

**Por que este problema existe**

Testes automáticos não reproduzem todas as barreiras enfrentadas por pessoas com deficiência. A validação exige pessoas, equipamentos e um critério de aceite definido pela Spark.

**Qual é o risco para a Spark**

Participantes podem não conseguir usar funções essenciais. Isso pode causar perda comercial, retrabalho, dano reputacional e possível exposição jurídica.

**O que já foi feito**

A interface foi verificada em diferentes tamanhos de tela, com cuidados de toque e movimento reduzido. Ainda não houve validação assistiva real.

**O que precisa ser decidido pelo CEO**

Aprovar o critério de aceite, decidir se a avaliação será interna ou contratada e autorizar os perfis e dispositivos que representarão os usuários.

**Recomendação**

Contratar uma avaliação focada nos fluxos essenciais do primeiro lançamento, incluindo pessoas que utilizem tecnologia assistiva. Impedimentos de uso devem bloquear o release; melhorias não críticas podem receber plano posterior aprovado.

**Consequência da decisão**

A avaliação pode acrescentar custo e prazo de correção, mas reduz retrabalho tardio e amplia o acesso ao produto.

**Prazo de decisão**

**Antes do release.** A contratação deve ser planejada durante staging.

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar escopo, critério de aceite e eventual contratação.
- **Desenvolvedor:** preparar o ambiente, apoiar a avaliação, corrigir barreiras e testar novamente.
- **Jurídico ou especialista externo:** orientar requisitos aplicáveis quando necessário.
- **Operação futura:** receber relatos de acessibilidade e encaminhá-los pelo processo definido.

### Automação adicional de segurança — PP-014

**O que é**

Algumas ferramentas que avisam automaticamente sobre falhas e atualizações não estão disponíveis no fluxo atual. Existem verificações substitutas, mas elas exigem mais acompanhamento manual.

**Por que este problema existe**

A disponibilidade depende do plano e das condições do serviço usado para hospedar o projeto.

**Qual é o risco para a Spark**

Um alerta importante pode ser identificado mais tarde, aumentando o esforço manual e o tempo de exposição.

**O que já foi feito**

O projeto mantém auditoria automática básica, versões controladas, análise de qualidade e revisão manual. O risco está mitigado, mas não encerrado.

**O que precisa ser decidido pelo CEO**

Aprovar eventual mudança de plano ou ferramenta equivalente, ou aceitar formalmente o risco residual de manter os controles atuais.

**Recomendação**

Comparar o custo da funcionalidade integrada com uma alternativa equivalente. Se o custo não se justificar no MVP, manter a mitigação atual com aceite formal e data de revisão.

**Consequência da decisão**

Contratar automação aumenta custo e reduz trabalho manual. Aceitar a mitigação preserva orçamento, mas mantém maior dependência de acompanhamento humano.

**Prazo de decisão**

**Antes do release.** Pode permanecer mitigado durante desenvolvimento e staging restrito.

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar orçamento, ferramenta ou aceite temporário do risco.
- **Desenvolvedor:** configurar e validar a solução escolhida ou manter os controles compensatórios.
- **Jurídico ou especialista externo:** revisar contrato do fornecedor quando aplicável.
- **Operação futura:** acompanhar alertas e cobrar tratamento dentro do processo aprovado.

### Serviço de e-mail para convites — PP-015

**O que é**

O envio de convites funciona apenas no ambiente local. Resend foi escolhido, mas ainda precisa ser contratado, configurado e validado.

**Por que este problema existe**

A escolha envolve custo, qualidade de entrega, suporte, limites, tratamento de falhas, domínio de envio, privacidade e contrato.

**Qual é o risco para a Spark**

Convites podem não chegar, mensagens podem ser classificadas como spam, falhas podem passar despercebidas e um fornecedor pode tratar dados sem instrumento contratual adequado.

**O que já foi feito**

O fluxo local foi validado. Resend, remetente no formato `no-reply@<domínio>` e um reenvio após 30 minutos foram aprovados. Persistindo a falha, o administrador do tenant deverá ser notificado. Domínio, contrato, integração e acompanhamento permanecem pendentes.

**O que precisa ser decidido pelo CEO**

Registrar/aprovar o domínio, autorizar a contratação já escolhida e definir expectativa de volume. Fornecedor, formato do remetente e regra de falha já foram decididos.

**Recomendação**

Validar juridicamente o Resend, registrar o domínio e executar um piloto em staging antes de assumir compromisso com clientes.

**Consequência da decisão**

Haverá custo recorrente e dependência externa, mas o fluxo de entrada de clientes e participantes poderá ser testado de ponta a ponta.

**Prazo de decisão**

**Antes de staging privado** que dependa de e-mail real; contrato e integração aprovados **antes do primeiro cliente**.

**Responsabilidade após aprovação**

- **Direção da Spark:** aprovar orçamento, registrar domínio e definir volume.
- **Desenvolvedor:** integrar envio, proteger convites, tratar tentativas e mensagens não entregues e configurar testes.
- **Jurídico ou especialista externo:** validar contrato, compartilhamento e tratamento de dados.
- **Operação futura:** acompanhar entregas, falhas, reputação do domínio e suporte.

### Alertas de segurança ainda sem correção compatível — PP-016

**O que é**

Existem alertas publicados sobre componentes usados no projeto. Parte deles está nas ferramentas de desenvolvimento, e algumas correções automáticas sugeridas poderiam causar regressão ou reduzir proteções existentes.

**Por que este problema existe**

Os fornecedores ainda não disponibilizaram uma combinação compatível que elimine todos os alertas sem comprometer o funcionamento e as verificações atuais.

**Qual é o risco para a Spark**

Uma vulnerabilidade pode afetar o produto ou seu processo de entrega. Também há risco em aplicar uma correção precipitada que torne o sistema instável ou menos seguro.

**O que já foi feito**

Componentes diretamente corrigíveis foram atualizados. Ferramentas de desenvolvimento não ficam expostas como parte do serviço, e o recurso específico associado a um alerta do frontend não é usado. A auditoria, porém, continua reprovada e o risco não está encerrado.

**O que precisa ser decidido pelo CEO**

Decidir se aceita temporariamente o risco residual para staging restrito e determinar que produção somente ocorrerá após nova avaliação, com correção compatível ou exceção formal, limitada e documentada.

**Recomendação**

Manter o bloqueio de produção, acompanhar atualizações seguras e não aplicar redução de versão apenas para eliminar o alerta do relatório. Toda exceção deve ter justificativa, prazo de revisão e aprovação expressa.

**Consequência da decisão**

Aguardar correções pode afetar o cronograma. Aceitar temporariamente o risco permite staging restrito, mas exige acompanhamento e não equivale a autorização de produção.

**Prazo de decisão**

**Antes de staging privado** para eventual aceite temporário e novamente **antes do release**.

**Responsabilidade após aprovação**

- **Direção da Spark:** aceitar ou rejeitar o risco residual e definir o limite dessa aceitação.
- **Desenvolvedor:** acompanhar correções, atualizar com segurança, executar testes e apresentar nova avaliação.
- **Jurídico ou especialista externo:** avaliar reflexos contratuais ou regulatórios quando aplicável.
- **Operação futura:** impedir release fora das condições aprovadas e acompanhar a data de revisão.

### Autorização de staging público e produção

**O que é**

É a decisão formal de abrir o produto para testes externos e, posteriormente, lançá-lo para clientes.

**Por que este problema existe**

Uma implantação tecnicamente possível não significa que contratos, operação, privacidade, fornecedores, recuperação e riscos foram aprovados pela empresa.

**Qual é o risco para a Spark**

Abrir o produto sem os gates concluídos pode expor dados, assumir compromissos sem capacidade operacional e transferir informalmente ao Desenvolvedor um risco que pertence à empresa.

**O que já foi feito**

O roadmap define um ensaio de release, critérios técnicos e bloqueios por problemas postergados. Não existe evidência de staging ou produção aprovados.

**O que precisa ser decidido pelo CEO**

Aprovar critérios formais de entrada em staging público e produção, indicar quem consolida as evidências e registrar a decisão final de autorizar ou não cada abertura.

**Recomendação**

Usar uma decisão formal de “autorizar ou não autorizar” baseada em checklist único, sem permitir que a conclusão técnica seja interpretada automaticamente como aprovação empresarial.

**Consequência da decisão**

Pode haver adiamento de abertura quando faltarem evidências, mas a empresa preserva controle sobre compromissos, riscos e comunicação com clientes.

**Prazo de decisão**

**Antes de staging público** e novamente **antes do release**.

**Responsabilidade após aprovação**

- **Direção da Spark:** definir critérios, aceitar riscos residuais e autorizar cada abertura.
- **Desenvolvedor:** preparar o ambiente e o candidato, executar verificações e apresentar evidências.
- **Jurídico ou especialista externo:** confirmar os gates jurídicos aplicáveis.
- **Operação futura:** executar o checklist, registrar a decisão e impedir abertura sem autorização.

## 5. Quadro consolidado de decisões

| Tema | Decisão necessária | Recomendação | Prazo | Responsável pela decisão | Quem implementa |
|---|---|---|---|---|---|
| Dados pessoais e titulares | aprovar matriz, responsáveis e encaminhamento jurídico | manter decisões já tomadas e concluir revisão coordenada | agora | CEO/Direção + Jurídico | Desenvolvedor e operação |
| Acessos operacionais | aprovar privilégio mínimo e responsáveis administrativos | acessos separados e restritos | antes de staging privado | CEO/Direção | Desenvolvedor e operação |
| Chaves e segredos | aprovar responsáveis e política de troca | implementar Railway Environment Variables | antes de staging privado | CEO/Direção | Desenvolvedor e operação |
| Backup e recuperação | aprovar orçamento, validação dos 90 dias e evidências | comprovar RPO 1h/RTO 4h com Cloudflare R2 | antes de staging privado | CEO/Direção + Jurídico | Desenvolvedor e operação |
| Incidentes | autorizar contas corporativas e aprovar canal final e responsáveis | preservar a prova Sentry/Better Stack do laboratório, implementar OpenTelemetry e ensaiar o runbook | antes de staging público | CEO/Direção | Desenvolvedor e operação |
| Acessibilidade | aprovar critério e avaliação humana | avaliar fluxos essenciais com usuários de tecnologia assistiva | antes do release | CEO/Direção | Especialista e Desenvolvedor |
| Automação de segurança | contratar solução ou aceitar mitigação | comparar custo; documentar aceite se mantida a mitigação | antes do release | CEO/Direção | Desenvolvedor |
| E-mail | registrar domínio, validar contrato e definir volume | piloto do Resend em staging | antes de staging com e-mail real | CEO/Direção + Jurídico | Desenvolvedor e operação |
| Alertas de segurança | aceitar ou rejeitar risco temporário | bloquear produção até correção ou exceção formal | staging privado e release | CEO/Direção | Desenvolvedor e operação |
| Staging e produção | aprovar critérios e decisão final de abertura | checklist único e autorização expressa | staging público e release | CEO/Direção | Desenvolvedor e operação |

## 6. Decisões já aprovadas

As decisões abaixo pertencem ao PP-004. Elas já foram aprovadas empresarialmente e não devem ser apresentadas como escolhas ainda em aberto.

| Decisão | Situação atual | Próxima ação | Validação jurídica |
|---|---|---|---|
| Papéis de controlador, operador ou responsabilidade conjunta definidos por operação e contrato | aprovada como diretriz; contratos ainda não formalizados | completar matriz e refletir a classificação em cada contrato | necessária |
| Dados do cliente empresarial podem permanecer por até 60 dias após encerramento | prazo empresarial aprovado; automação ainda não implementada | validar exceções e implementar exclusão, anonimização ou retenção legal após o prazo | necessária para exceções e instrumentos |
| Registros de auditoria retidos por 1 ano, salvo exigência diferente | prazo aprovado; mecanismo ainda pendente | validar exceções legais/contratuais e implementar retenção | necessária para exceções |
| Exclusão de participante atendida por anonimização quando juridicamente aplicável | diretriz aprovada; critérios finais pendentes | definir o que pode ser preservado e implementar o mecanismo | necessária |
| Declaração completa de acesso em até 15 dias quando o prazo legal for aplicável | prazo registrado; procedimento final pendente | validar fluxo, responsáveis e modelos de resposta | necessária |
| `privacidade@sparkinteligencia.com.br` como canal oficial | aprovado; gestão pertence à Spark | designar responsável, registrar procedimento e operar o canal | necessária para revisão do procedimento |

## 7. Decisões que exigem jurídico

A aprovação empresarial não encerra os seguintes pontos sem revisão jurídica:

- política de privacidade e termos de uso;
- contratos com clientes empresariais e fornecedores;
- matriz de operações de tratamento, finalidades e bases legais;
- definição do papel da Spark e de cada cliente em cada operação;
- direitos dos titulares e conteúdo das respostas;
- exceções legais ou contratuais aos prazos de retenção;
- dados que podem ser preservados após anonimização;
- compartilhamento de dados com fornecedores de hospedagem, monitoramento e e-mail;
- coerência entre metas operacionais, compromissos comerciais e contratos.

O Desenvolvedor pode preparar mecanismos, inventários técnicos e evidências. Ele não valida juridicamente políticas, bases legais, contratos ou responsabilidades dos agentes de tratamento.

## 8. Ordem recomendada de aprovação

1. **Decisões que bloqueiam dados reais:** formalizar PP-004, designar o responsável por privacidade e encaminhar documentos ao Jurídico.
2. **Decisões para staging privado:** aprovar acessos, orçamento, responsáveis por segredos, validação da retenção de backup e eventual aceite temporário do PP-016.
3. **Decisões para staging público:** contratar BetterStack, definir canal, aprovar responsáveis por incidentes, validar o Resend, registrar domínio e definir critérios formais de abertura.
4. **Decisões para produção:** aprovar evidências de recuperação, acessibilidade, segurança, contratos, operação e decisão final de release.
5. **Após o MVP:** reavaliar automações adicionais que tenham recebido aceite formal de risco e melhorias de acessibilidade classificadas como não bloqueantes. Obrigações jurídicas e controles essenciais não devem ser transferidos para pós-MVP.

## 9. Próximos passos para o CEO

- confirmar a manutenção das decisões já aprovadas do PP-004 e autorizar sua formalização jurídica;
- designar o responsável interno pelo canal de privacidade;
- autorizar o orçamento para cumprir RPO de 1 hora e RTO de 4 horas;
- validar/contratar Railway, Cloudflare R2, Sentry, BetterStack e Resend;
- aprovar quem terá acessos administrativos e quem responderá por incidentes;
- decidir o critério e o orçamento para validação humana de acessibilidade;
- aceitar ou rejeitar formalmente os riscos residuais dos PP-014 e PP-016;
- aprovar um checklist executivo para staging público e outro para produção;
- registrar separadamente cada autorização de staging e release.

## 10. Escopo auditado

### Problemas incluídos

- PP-004, PP-005, PP-006, PP-007, PP-008;
- PP-010, PP-014, PP-015 e PP-016;
- autorização de staging público e produção, registrada na governança e no roadmap.

### Problemas excluídos por serem exclusivamente técnicos

- PP-001, PP-002, PP-003 e PP-009;
- PP-011, PP-012, PP-013 e PP-017.

Os problemas encerrados foram excluídos mesmo quando seu histórico contém risco. O PP-002 e o PP-009 permanecem abertos, mas sua resolução não exige decisão empresarial segundo a matriz de responsabilidades atual.

### Fontes documentais

- [`../GOVERNANCA.md`](../GOVERNANCA.md) — caminho canônico real confirmado na raiz;
- [`PROBLEMAS_POSTERGADOS.md`](PROBLEMAS_POSTERGADOS.md);
- [`ROADMAP.md`](ROADMAP.md);
- [`RELATORIO_PROGRESSO.md`](RELATORIO_PROGRESSO.md);
- [`../ARQUITETURA.md`](../ARQUITETURA.md);
- [`adr/003-lifecycle-exclusao-retencao.md`](adr/003-lifecycle-exclusao-retencao.md);
- [`adr/005-acesso-plataforma-super-admin.md`](adr/005-acesso-plataforma-super-admin.md);
- [`adr/009-refresh-token-rotativo.md`](adr/009-refresh-token-rotativo.md);
- [`adr/010-transporte-cors-csrf.md`](adr/010-transporte-cors-csrf.md);
- [`adr/012-convites-entrada-nominal.md`](adr/012-convites-entrada-nominal.md);
- [`adr/014-execucao-ciclos-fatos-privacidade.md`](adr/014-execucao-ciclos-fatos-privacidade.md);
- [`adr/015-eventos-internos-gamificacao-auditoria.md`](adr/015-eventos-internos-gamificacao-auditoria.md).

### Inconsistência tratada

O resumo de problemas postergados ainda afirmava que não existia política de retenção aprovada. A auditoria confrontou essa frase com a governança e com o próprio PP-004, que registram decisões aprovadas em 26/07/2026. O relatório considera as políticas centrais aprovadas e mantém como pendentes somente sua formalização, validação jurídica e implementação.
