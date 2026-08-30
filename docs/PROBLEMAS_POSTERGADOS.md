# Relatório de problemas postergados

> Disciplina PRO · Criado em 16/07/2026 · Atualizado em 03/08/2026

## 1. Objetivo

Este relatório registra riscos conhecidos, dívidas técnicas e garantias ainda incompletas que foram conscientemente adiadas. Ele não substitui o roadmap: funcionalidades futuras aparecem aqui somente quando sua ausência cria uma limitação ou risco no estado atual.

Status utilizados:

- **ABERTO:** problema conhecido sem mitigação suficiente;
- **MITIGADO:** risco permanece, mas existe controle temporário verificável;
- **PLANEJADO:** ausência esperada, com fase e gate já definidos;
- **ENCERRADO:** critério objetivo atendido, com resolução e evidência preservadas;
- **FORA DO MVP:** não deve consumir esforço do roadmap atual.

Prioridades:

- **P0:** impede dados ou usuários reais;
- **P1:** precisa fechar antes de staging/release;
- **P2:** melhoria controlada, sem bloquear a fase atual.

## 2. Resumo executivo

O projeto está adequado para continuar o desenvolvimento local. B2–B6.5 provaram autenticação, isolamento, entrada nominal, catálogo, execução, consequências e integração da gamificação; B8 removeu as fontes locais de negócio e versionou a prova Playwright frontend–API. O sistema **ainda não está pronto para armazenar dados reais de empresas ou participantes**: as políticas centrais do PP-004 ainda dependem de formalização, validação jurídica e implementação, e não há ambiente operacional de staging.

| Prioridade | Abertos/planejados | Mitigados | Encerrados |
|---|---:|---:|---:|
| P0 | 0 | 0 | 3 |
| P1 | 7 | 0 | 3 |
| P2 | 0 | 2 | 2 |

## 3. Bloqueios para dados ou usuários reais

### PP-001 — Autenticação e autorização ainda incompletas — ENCERRADO

- **Prioridade/status:** P0 · ENCERRADO em 23/07/2026
- **Resolução:** autenticação privada por padrão, revalidação de sessão, contextos atuais de tenant/plataforma, permissions e escopo de recurso foram implementados até B2.3.
- **Evidência:** a matriz E2E B2.4 cobre bearer ausente, logout com revogação do access token já emitido, header inválido, ausência de membership, roles, escopo nominal e mudanças de estado com efeito imediato.
- **Critério de encerramento:** gates E2E negativos e positivos de sessão, revogação, tenant, role e escopo aprovados.

### PP-002 — Persistência frontend local remanescente — ENCERRADO

- **Prioridade/status:** P0 · ENCERRADO em 03/08/2026
- **Problema original:** fatos e projeções de negócio eram mantidos ou derivados de `localStorage`, podendo divergir entre dispositivos.
- **Resolução:** Projeto 66, gamificação, tracker, ritual e missões possuem fontes de verdade ou projeções server-side; não existe repository local de negócio no frontend.
- **Evidência:** a suíte Playwright versionada reconstrói tracker e ritual em outro contexto autenticado, confirma as missões remotas e instrumenta o navegador para provar ausência de acesso a `localStorage`.
- **Motivo do adiamento:** adapters HTTP dependem dos módulos backend estabilizados.
- **Retomada:** B8.4 versiona a prova Playwright dos adapters contra a API.
- **Critério de encerramento:** repositories HTTP substituem persistência local, nenhum dado real sensível permanece no browser como fonte de verdade e o fluxo frontend–API é reproduzido no E2E versionado.

### PP-003 — Isolamento multi-tenant ainda não provado — ENCERRADO

- **Prioridade/status:** P0 · ENCERRADO em 23/07/2026
- **Resolução:** constraints compostas, guards, repositories com `tenantId`, casos de uso com ownership/escopo e erros não enumeráveis foram implementados em B2.1–B2.3.
- **Evidência:** integração PostgreSQL prova constraints e concorrência; a matriz E2E B2.4 usa dois tenants e três times e rejeita seleção sem membership, recurso estrangeiro, Manager fora do time e bypass por `SUPER_ADMIN`.
- **Critério de encerramento:** testes negativos provam isolamento entre tenants e escopo de Manager/CEO em repository, caso de uso e HTTP.

## 4. Problemas que bloqueiam staging ou release

### PP-004 — Retenção, exclusão e atendimento ao titular parcialmente definidos

- **Prioridade/status:** P1 · ABERTO
- **Decisões aprovadas em 26/07/2026:** não há classificação global de agente de tratamento; controlador, operador ou controladoria conjunta serão definidos por operação e contrato. Tenant encerrado terá retenção operacional por até 60 dias e, depois, exclusão, anonimização ou retenção legal. `AuditEvent` terá retenção de 1 ano, salvo obrigação legal ou contratual diferente. Quando juridicamente permitido, dados pessoais do participante serão anonimizados, preservando apenas o necessário para auditoria, obrigações legais, estatísticas e integridade histórica. O canal oficial do titular é [privacidade@sparkinteligencia.com.br](mailto:privacidade@sparkinteligencia.com.br).
- **Atendimento ao titular:** registrar confirmação da solicitação; fornecer declaração completa em até 15 dias quando aplicável pela legislação; tratar as demais solicitações conforme política interna da Spark e requisitos legais. SLA interno diverso será meta operacional, não prazo legal.
- **Problema restante:** faltam implementar e testar os jobs/mecanismos; completar a matriz por operação e categoria; formalizar contratos e documentos jurídicos; e obter validação jurídica das bases, exceções, compartilhamentos e procedimento final.
- **Impacto:** risco de retenção excessiva ou remoção indevida de dados pessoais, privados e de auditoria.
- **Responsabilidades:** a Spark define e aprova políticas, administra o canal e responde ao titular; o Desenvolvedor implementa mecanismos e jobs; a validação jurídica futura confirma bases, exceções, contratos, classificação por operação e conformidade final.
- **Retomada:** B10.2, após o contrato operacional B10.0 e antes de qualquer ensaio de staging.
- **Critério de encerramento:** matriz por operação/categoria com finalidade, base, papel contratual, prazo e destino aprovada pela Spark e validada juridicamente; contratos e documentos jurídicos atualizados; fluxos de confirmação, acesso, correção, exportação, anonimização ou exclusão e jobs automatizados testados/documentados.

### PP-005 — Aplicação e migrations usam o mesmo papel de banco

- **Prioridade/status:** P1 · ABERTO
- **Problema:** o ambiente local usa um proprietário com privilégios para migrations e runtime. A proteção append-only de `AuditEvent` não substitui privilégio mínimo contra comandos administrativos como `TRUNCATE`.
- **Impacto:** comprometimento da aplicação poderia alcançar operações de schema ou destrutivas além do necessário.
- **Motivo do adiamento:** separação de credenciais depende do desenho do ambiente hospedado.
- **Retomada:** B10, antes de staging público.
- **Critério de encerramento:** roles separadas para migration e runtime; runtime sem DDL, truncate ou bypass de constraints; testes operacionais aprovados.

### PP-006 — Secrets, chaves JWT e rotação ainda sem infraestrutura

- **Prioridade/status:** P1 · PARCIALMENTE MITIGADO EM 30/08/2026
- **Problema:** `RS256`, `kid`, validação de produção, geração em memória, cadastro no Railway e runbook de rotação/comprometimento estão implementados no laboratório, mas a rotação e o comprometimento ainda precisam ser ensaiados.
- **Impacto:** sessão segura não pode operar fora do desenvolvimento.
- **Motivo do adiamento:** o contrato de B1.4 usa chaves efêmeras fora de produção; materialização operacional depende de staging.
- **Retomada:** B10 para operação.
- **Critério de encerramento:** chaves fora do Git, rotação ensaiada, acesso restrito, revogação e recuperação documentadas.
- **Decisão operacional de 03/08/2026, atualizada em 30/08/2026:** Railway Environment Variables será usado no MVP; Doppler poderá ser reavaliado futuramente. A BX.3 adicionou gerador de par RSA/peppers, validação fail-fast, regras de revogação/recuperação, cadastro no laboratório e prova externa. Rotação real, acesso corporativo restrito e ensaio de comprometimento continuam pendentes.

### PP-007 — Recuperação Railway/PITR e rollback ainda não ensaiados

- **Prioridade/status:** P1 · PARCIALMENTE MITIGADO
- **Problema:** o backup lógico diário e a restauração local estão comprovados, mas PITR, restore dentro do Railway, monitoramento de falha e ensaio de rollback/forward-fix ainda não foram comprovados.
- **Impacto:** risco de indisponibilidade ou perda de dados durante deploy/incidente.
- **Motivo do adiamento:** requer infraestrutura de staging e provedor definidos.
- **Retomada:** B10.
- **Critério de encerramento:** RPO/RTO definidos, backup verificado, restauração e rollback/forward-fix ensaiados.
- **Decisões operacionais de 03/08/2026, atualizadas em 30/08/2026:** RPO de 1 hora, RTO de 4 horas, backups retidos por 90 dias, cópia externa no Cloudflare R2 e rollback da aplicação apenas quando o schema for compatível; caso contrário, aplica-se forward-fix. Em 30/08, o job diário Railway → R2, o checksum e o restore local descartável do artefato `disciplina-pro-20260830T142746Z.dump` foram aprovados, recuperando 33 tabelas e os dados fictícios esperados. A retenção depende de validação jurídica; PITR/restore Railway, monitoramento, aceite formal e ensaio de falha de migration continuam pendentes antes da produção.

### PP-008 — Observabilidade externa ainda não implantada

- **Prioridade/status:** P1 · PARCIALMENTE MITIGADO EM 30/08/2026
- **Problema:** logging estruturado, redação de dados sensíveis, Sentry frontend/backend e Better Stack foram implementados e ensaiados no laboratório, mas OpenTelemetry, alertas/canais corporativos e runbook de incidente ainda não foram concluídos.
- **Impacto:** falhas e ataques podem não ser detectados ou diagnosticados em tempo adequado.
- **Motivo do adiamento:** serviço externo não é necessário para desenvolvimento local.
- **Retomada:** B10, antes de staging público.
- **Critério de encerramento:** alertas testados, redação de dados sensíveis confirmada e runbook com responsáveis.
- **Decisões operacionais de 03/08/2026, 21/08/2026 e 30/08/2026:** OpenTelemetry permanece como camada de instrumentação; Sentry frontend/backend está ativo no laboratório, captura `5xx`, ignora `4xx` e preserva somente metadados técnicos sanitizados e `requestId`. Better Stack monitora backend, frontend, rewrite Vercel/Railway e heartbeat do backup; o heartbeat usa período de 24 horas, tolerância de 5 horas e alerta após 29 horas. O alerta por e-mail do plano gratuito foi recebido; Telegram fica adiado até existir plano/canal compatível. Cobertura: segunda a sábado, 8h–20h; reconhecimento em até 30 minutos e início da resposta em até 2 horas. Permanecem pendentes OpenTelemetry, canais corporativos e runbook de incidente ensaiado.

### PP-009 — E2E frontend versionado insuficiente — ENCERRADO

- **Prioridade/status:** P1 · ENCERRADO em 03/08/2026
- **Problema original:** os fluxos autenticados e a integração frontend–API não possuíam suíte de navegador versionada no CI.
- **Resolução:** B8.4 versionou harness, fixture protegida e quatro jornadas para sessão, catálogo, execução, privacidade, tracker, ritual e missões em projetos desktop/mobile.
- **Evidência:** a suíte Playwright é chamada pelo CI, usa fixture descartável com reset protegido e autenticação reutilizável por papel; cobre sessão, catálogo, execução, privacidade, tracker, ritual, missões, administração, Projeto 66, diálogo de crise e os viewports auditados.
- **Motivo do adiamento original:** os adapters HTTP e seus contratos precisavam estabilizar antes da jornada de navegador.
- **Ampliação planejada:** B10 executará os fluxos críticos em staging sem reabrir o critério local já atendido.
- **Critério de encerramento:** suíte Playwright versionada no CI cobrindo login, ciclo principal, privacidade e viewports críticas.

### PP-010 — Acessibilidade sem validação assistiva real

- **Prioridade/status:** P1 · ABERTO
- **Problema:** responsividade, toque e movimento reduzido foram auditados, mas faltam leitor de tela real, navegação assistiva e dispositivos físicos.
- **Impacto:** barreiras podem permanecer invisíveis aos testes automatizados e ao navegador desktop.
- **Motivo do adiamento:** requer dispositivos e validação humana dedicada.
- **Retomada:** B10.
- **Critério de encerramento:** fluxos críticos aprovados com teclado, leitor de tela e dispositivos físicos representativos.

### PP-011 — Quality Gate ainda é baseline progressiva

- **Prioridade/status:** P1 · ENCERRADO EM 20/07/2026
- **Problema original:** CI e SonarQube Cloud estavam aprovados, mas nenhuma cobertura mínima bloqueava regressões globais.
- **Resolução:** o backend passou a impor pisos de 30% statements, 20% branches, 25% functions e 30% lines; o frontend, 19%, 60%, 40% e 19%, respectivamente. Análise de código novo e gates funcionais permanecem obrigatórios.
- **Evidência de encerramento:** `test:coverage` supera os pisos dos dois workspaces e o CI bloqueia regressões abaixo deles. Os limites serão elevados progressivamente por módulo.

## 5. Dependências e cadeia de suprimentos

### PP-012 — Advisory moderado transitivo do Prisma CLI

- **Prioridade/status:** P2 · ENCERRADO EM 20/07/2026
- **Problema original:** Prisma CLI 7.8.0 trazia `@prisma/dev` → `@hono/node-server` 1.19.11, afetado pelo advisory `GHSA-92pp-h63x-v22m` em `serveStatic`.
- **Resolução:** Prisma CLI, client e adapter foram atualizados em conjunto para 7.9.0, mantendo versões exatas e a allowlist explícita de scripts de instalação.
- **Evidência de encerramento:** `npm audit --workspaces` retornou zero vulnerabilidades e os gates do B1.4 permaneceram aprovados.

### PP-013 — Verificação GPG ignorada pela action do Sonar

- **Prioridade/status:** P2 · ENCERRADO EM 20/07/2026
- **Problema original:** o scanner emitia aviso de verificação GPG ignorada e o workflow referenciava apenas a tag major mutável.
- **Resolução:** `SonarSource/sonarqube-scan-action` foi fixada ao commit oficial `c7ee0f9d...` resolvido da tag v7 e atualizações futuras exigem revisão deliberada.
- **Evidência de encerramento:** workflow versionado por SHA e Quality Gate obrigatório. A anotação do scanner pode permanecer como limitação da distribuição oficial, sem permitir troca silenciosa da action.

### PP-014 — Dependabot e CodeQL indisponíveis no fluxo atual

- **Prioridade/status:** P2 · MITIGADO
- **Problema:** recursos automáticos foram retirados devido às limitações observadas no plano/repositório privado.
- **Impacto:** menor automação para alertas e atualização de dependências.
- **Mitigação atual:** `npm audit` no CI, lockfile, versões críticas fixadas, SonarQube Cloud e revisão manual.
- **Retomada:** mudança de disponibilidade/plano ou antes do release, caso o risco residual seja considerado alto.
- **Critério de encerramento:** automação equivalente habilitada e validada sem duplicar ou enfraquecer o CI.

## 6. Dependências externas adiadas

### PP-015 — E-mail transacional selecionado, ainda não integrado

- **Prioridade/status:** P2 · PARCIALMENTE MITIGADO EM 25/07/2026
- **Problema:** Resend foi selecionado para e-mail real, mas domínio, contrato, integração, observabilidade e operação ainda não estão concluídos.
- **Impacto:** o fluxo de entrada de membros não poderá ser validado ponta a ponta por e-mail.
- **Mitigação entregue:** Mailpit `v1.30.5`, adapter Nodemailer e gate SMTP real encerram a dependência local da B3.
- **Decisões operacionais de 03/08/2026:** Resend; remetente `no-reply@<domínio>`; um reenvio após 30 minutos; persistindo a falha, notificar o administrador do tenant. O domínio permanece indefinido e o contrato depende de validação jurídica.
- **Retomada:** registrar domínio, validar o fornecedor, integrar envio, retry e bounce antes de staging com e-mail real.
- **Critério de encerramento:** envio, expiração, retry, bounce e não exposição de token cobertos por testes/observabilidade.

### PP-016 — Advisories publicados após o baseline B1

- **Prioridade/status:** P1 · PARCIALMENTE MITIGADO EM 03/08/2026
- **Problema:** a auditoria bruta atual registra duas ocorrências altas (`react-router` e `react-router-dom`) do mesmo `GHSA-qwww-vcr4-c8h2`. O advisory afeta o modo RSC, não habilitado por esta SPA Vite/`BrowserRouter`; o npm propõe um downgrade incompatível como correção automática.
- **Impacto:** `npm audit --workspaces --audit-level=high` permanece não zero, embora o vetor RSC não exista na aplicação atual.
- **Mitigação imediata:** Prisma 7.9.1 eliminou os achados de `@prisma/dev`, `find-my-way` e `valibot`; versões corrigidas de `brace-expansion` eliminaram os achados de Jest/Nest CLI. `fast-uri` 3.1.4 e `postcss` 8.5.23 permanecem fixados por overrides compatíveis. O gate versionado aceita exclusivamente o GHSA conhecido nos dois pacotes afetados, confirma a ausência de RSC e reprova qualquer advisory alto novo.
- **Retomada:** atualizar React Router para uma versão corrigida compatível, com teste de regressão, assim que disponível; não aceitar downgrade automático ou override incompatível.
- **Critério de encerramento:** auditoria volta a zero sem reduzir versões de segurança ou quebrar os gates.

### PP-017 — Allowlist CORS não inclui PUT — ENCERRADO

- **Prioridade/status:** P1 · ENCERRADO em 26/07/2026
- **Resolução:** `configureApp` passou a anunciar `PUT` sem ampliar origens ou headers permitidos.
- **Evidência:** `backend/src/http/configure-app.ts` contém a allowlist reconciliada; `backend/test/health.e2e-spec.ts` executa `OPTIONS` sobre uma rota real de registro diário, exige a origem exata e comprova `PUT` em `Access-Control-Allow-Methods`.
- **Critério de encerramento:** allowlist e contrato de transporte reconciliados, com teste de preflight para método `PUT`.

## 7. Itens fora do MVP — não são dívida atual

- customização de programas por tenant;
- billing e cobrança;
- IA;
- microserviços e filas externas;
- editor de gamificação;
- notificações avançadas;
- relatórios analíticos avançados;
- aplicativo móvel nativo.

Esses itens só devem virar problemas ativos após decisão explícita de produto. Não podem ser usados para desviar esforço dos itens P0/P1.

## 8. Governança do relatório

1. Todo adiamento que afete segurança, privacidade, integridade, operação ou testabilidade recebe um identificador `PP-*`.
2. O item registra dono por fase, critério objetivo de encerramento e mitigação temporária quando existir.
3. Um problema não muda para resolvido apenas porque deixou de aparecer em uma ferramenta; exige evidência do critério de encerramento.
4. Nenhum uso com dados reais é autorizado enquanto houver P0 aberto.
5. Nenhum staging público ou release é autorizado enquanto houver P1 sem aceitação explícita e mitigação revisada.
6. Itens resolvidos permanecem no histórico em seção própria numa revisão futura, com commit e evidências.

### 8.1 Matriz obrigatória de responsabilidade de todos os PP

Esta matriz integra cada registro `PP-*`. “Aprova” identifica quem deve aceitar a evidência de encerramento; nenhum item é encerrado apenas por documentação.

| PP | Grupo | Quem decide | Quem implementa | Quem aprova | Evidência de encerramento ou pendência restante |
|---|---|---|---|---|---|
| PP-001 | Desenvolvedor | arquitetura aprovada | Desenvolvedor | gate técnico; Spark para uso real | encerrado: matriz E2E de autenticação/autorização |
| PP-002 | Desenvolvedor | arquitetura/roadmap aprovados | Desenvolvedor | gate técnico; Spark para uso real | adapters HTTP e ausência de repository local de negócio |
| PP-003 | Desenvolvedor | arquitetura aprovada | Desenvolvedor | gate técnico; Spark para uso real | encerrado: constraints e matriz E2E multi-tenant |
| PP-004 | Spark + Jurídico + Desenvolvedor | Spark define políticas; Jurídico valida enquadramento | Desenvolvedor implementa jobs e fluxos; Spark opera atendimento | Spark e validação jurídica, além dos gates técnicos | matriz e contratos validados; jobs e direitos do titular testados |
| PP-005 | Desenvolvedor + Spark | Spark escolhe ambiente/provedor e aceita risco; desenho técnico segue arquitetura | Desenvolvedor | Spark no gate de staging | roles distintas e teste de privilégio mínimo |
| PP-006 | Desenvolvedor + Spark | Spark escolhe/contrata secret manager e aprova política operacional | Desenvolvedor | Spark no gate de staging | secret manager e ensaio de rotação/comprometimento |
| PP-007 | Spark + Desenvolvedor | Spark define RPO/RTO e aceita risco | Desenvolvedor implementa e ensaia | Spark | política aprovada, backups verificados e restore/rollback ensaiados |
| PP-008 | Spark + Desenvolvedor | Spark aprovou BetterStack/Sentry e define cobertura e responsáveis | Desenvolvedor implementa instrumentação, monitoramento e runbook | Spark | serviços contratados; alertas e resposta a incidente testados sem dados sensíveis |
| PP-009 | Desenvolvedor | roadmap aprovado | Desenvolvedor | gate técnico | suíte Playwright versionada no CI e staging |
| PP-010 | Spark + Desenvolvedor | Spark define critério de aceite e disponibiliza validação humana/dispositivos | Desenvolvedor corrige barreiras técnicas | Spark, com validação humana | teclado, leitor de tela e dispositivos físicos aprovados |
| PP-011 | Desenvolvedor | governança técnica aprovada | Desenvolvedor | gate técnico | encerrado: pisos de cobertura no CI |
| PP-012 | Desenvolvedor | governança de dependências aprovada | Desenvolvedor | gate técnico | encerrado: atualização compatível e auditoria limpa |
| PP-013 | Desenvolvedor | governança de CI aprovada | Desenvolvedor | gate técnico | encerrado: action fixada por SHA |
| PP-014 | Desenvolvedor + Spark | Spark decide plano/serviço e aceita risco residual | Desenvolvedor configura automação | Spark no gate de release | CodeQL/Dependabot ou equivalente validado |
| PP-015 | Spark + Jurídico + Desenvolvedor | Spark seleciona/contrata provedor e define SLA; Jurídico valida contrato/tratamento | Desenvolvedor integra retry, bounce e observabilidade | Spark e validação jurídica contratual | provedor contratado; envio, retry, bounce e privacidade testados |
| PP-016 | Desenvolvedor + Spark | Desenvolvedor propõe atualização segura; Spark aceita eventual risco empresarial residual | Desenvolvedor | gate técnico e Spark no release | auditoria sem achados no nível configurado |
| PP-017 | Desenvolvedor | contrato técnico aprovado | Desenvolvedor | gate técnico | encerrado: preflight real e allowlist reconciliada |

Classificação consolidada:

- **exclusivamente solucionáveis pelo Desenvolvedor:** PP-001, PP-002, PP-003, PP-009, PP-011, PP-012, PP-013 e PP-017;
- **exigem decisão ou aprovação da Spark:** PP-004, PP-005, PP-006, PP-007, PP-008, PP-010, PP-014, PP-015 e PP-016;
- **exigem validação jurídica:** PP-004 e PP-015. Outros PP deverão ser reclassificados se surgir impacto jurídico documentado, sem presunção pelo Desenvolvedor.

## 9. Revisões preventivas

### 21/07/2026 — Auditoria do backend após B1

- os itens `PP-001` a `PP-015` foram confrontados com o backend, os ADRs e os gates versionados;
- nenhum bloqueio planejado foi encerrado sem satisfazer seu critério objetivo;
- a validação de ambiente foi corrigida para rejeitar origens com caminho, query, fragmento, barra final ou esquema não HTTP(S), exigir HTTPS em produção e restringir `DATABASE_URL` ao PostgreSQL;
- a correção fecha uma inconsistência da B1 com o ADR 010 e não cria problema postergado, pois foi tratada imediatamente com testes automatizados.

### 25/07/2026 — Revisão de encerramento da B3

- `PP-015` permanece parcialmente mitigado: o ciclo local foi provado com Mailpit, mas provedor, retry e bounce continuam obrigatórios antes de staging;
- `PP-016` foi reconfirmado pela auditoria remota com 29 achados e permanece P1; nenhuma sugestão de downgrade ou override incompatível foi aplicada;
- a matriz E2E da B3.5 comprovou primeiro CEO, identidades nova/existente, concorrência, expiração, revogação, rotação e escopo de Manager;
- nenhum problema funcional novo foi encontrado no backend de convites; o encerramento da B3 não altera o bloqueio de staging imposto pelo P1.

### 25/07/2026 — Revisão após B4 e início da B5

- o resumo executivo foi reconciliado com os status individuais: 1 P0 aberto, 8 P1 abertos/planejados, 1 P1 encerrado, 2 P2 mitigados e 2 P2 encerrados;
- `PP-002` começa a ser reduzido na B5.5, mas só encerra quando B8 remover `localStorage` como fonte de verdade para dados reais;
- B4 provou catálogo, disponibilidade e isolamento; B5.0 separou fatos objetivos de respostas privadas e B5.1 iniciou sua persistência estrutural;
- B5.2 congelou versão e timezone no início transacional, manteve leitura restrita à membership proprietária e evitou copiar o motivo de abandono para auditoria;
- B5.3 integrou bloqueios administrativos às transações organizacionais e comprovou que reativação não retoma ciclos implicitamente;
- B5.4 implementou fatos objetivos no backend e isolou respostas privadas em repository, controller e DTOs exclusivos, sem payload em auditoria; B5.5.0–B5.5.4 removeu as fontes locais do módulo Projeto 66, B6.5 removeu o ledger local de gamificação e B8.2.2/B8.3 migraram tracker, ritual e missões; `PP-002` está mitigado até a prova E2E da B8.4;

### 26/07/2026 — Auditoria documental e de gates

- as seis migrations foram aplicadas em banco vazio; 98 testes unitários backend, 7 frontend, 63 integrações, 19 E2E backend e 1 teste SMTP foram aprovados;
- `PP-016` foi reconfirmado com 29 achados (28 altos e 1 moderado), sem aplicar downgrade ou correção forçada;
- `PP-017` registra a divergência entre as rotas `PUT` e a allowlist CORS; nenhuma funcionalidade foi alterada durante a auditoria documental;
- não existe suíte Playwright frontend versionada, staging validado ou evidência de produção.
- nenhum item P0 ou P1 foi reclassificado sem atender ao critério objetivo; uso real e staging continuam bloqueados.

### 03/08/2026 — Mitigação compatível do PP-016

- Prisma, `brace-expansion` e seus transitivos vulneráveis foram atualizados sem `--force`; a auditoria bruta caiu para duas ocorrências altas do mesmo advisory RSC não aplicável à SPA atual;
- o gate `audit:dependencies` registra a exceção pelo identificador exato, limitada a `react-router` e `react-router-dom`, e continua reprovando qualquer vulnerabilidade alta nova;
- instalação limpa, nove migrations em banco vazio, 82 testes de integração e 20 E2E foram aprovados após a atualização; o PP-016 permanece aberto até a auditoria bruta zerar.

### 26/07/2026 — Encerramento da B6.1

- `PP-017` foi encerrado após reconciliação da allowlist CORS e aprovação do preflight automatizado para `PUT`;
- a fundação persistente de eventos foi aplicada como sétima migration em banco vazio, sem implementar antecipadamente dispatcher, XP ou consultas de auditoria;
- 22 suítes/64 testes de integração e 5 suítes/20 testes E2E foram aprovados.

### 26/07/2026 — Decisão de governança do PP-004

- políticas de tenant, `AuditEvent`, anonimização de participante e atendimento ao titular foram aprovadas pela Spark;
- o PP-004 permanece aberto porque jobs, matriz definitiva, instrumentos contratuais e validação jurídica ainda não existem;
- todos os PP foram classificados por decisão, implementação, aprovação e evidência;
- responsabilidades empresariais, comerciais e jurídicas deixaram de ser implicitamente atribuídas ao Desenvolvedor.
