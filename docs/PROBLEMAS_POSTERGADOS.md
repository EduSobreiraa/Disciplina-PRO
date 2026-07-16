# Relatório de problemas postergados

> Disciplina PRO · Criado em 16/07/2026 · Revisar a cada encerramento de bloco

## 1. Objetivo

Este relatório registra riscos conhecidos, dívidas técnicas e garantias ainda incompletas que foram conscientemente adiadas. Ele não substitui o roadmap: funcionalidades futuras aparecem aqui somente quando sua ausência cria uma limitação ou risco no estado atual.

Status utilizados:

- **ABERTO:** problema conhecido sem mitigação suficiente;
- **MITIGADO:** risco permanece, mas existe controle temporário verificável;
- **PLANEJADO:** ausência esperada, com fase e gate já definidos;
- **FORA DO MVP:** não deve consumir esforço do roadmap atual.

Prioridades:

- **P0:** impede dados ou usuários reais;
- **P1:** precisa fechar antes de staging/release;
- **P2:** melhoria controlada, sem bloquear a fase atual.

## 2. Resumo executivo

O projeto está adequado para continuar o desenvolvimento local, mas **não está pronto para armazenar dados reais de empresas ou participantes**. Os maiores bloqueios são sessão/autorização ainda incompletas, persistência frontend em `localStorage`, política legal de retenção indefinida e ausência do ambiente operacional de staging.

| Prioridade | Abertos/planejados | Mitigados |
|---|---:|---:|
| P0 | 3 | 0 |
| P1 | 7 | 1 |
| P2 | 2 | 2 |

## 3. Bloqueios para dados ou usuários reais

### PP-001 — Autenticação e autorização ainda incompletas

- **Prioridade/status:** P0 · PLANEJADO
- **Problema:** o schema e as credenciais existem, mas JWT, refresh, endpoints HTTP, `AuthenticationGuard`, contexto de tenant e autorização por role/escopo ainda não foram implementados.
- **Impacto:** nenhuma rota de negócio pode ser considerada protegida; identidade autenticada ainda não equivale a acesso autorizado.
- **Motivo do adiamento:** execução sequencial da B1; B1.1–B1.3 precisavam estabilizar persistência antes da sessão.
- **Retomada:** B1.4–B1.6; autorização organizacional completa na B2.
- **Critério de encerramento:** gates E2E negativos e positivos de sessão, revogação, tenant, role e escopo aprovados.

### PP-002 — Dados frontend em localStorage

- **Prioridade/status:** P0 · ABERTO
- **Problema:** progresso, gamificação e conteúdo íntimo permanecem em repositories locais e `localStorage`.
- **Impacto:** não há proteção adequada contra acesso pelo navegador, perda de dispositivo, XSS, adulteração ou ausência de backup; conteúdo privado não pode ser tratado como dado de produção.
- **Mitigação atual:** separação física entre chaves objetivas e privadas e proibição documental de uso real.
- **Motivo do adiamento:** adapters HTTP dependem dos módulos backend estabilizados.
- **Retomada:** B8, progressivamente após B5–B7.
- **Critério de encerramento:** repositories HTTP substituem persistência local; nenhum dado real sensível permanece no browser como fonte de verdade.

### PP-003 — Isolamento multi-tenant ainda não provado

- **Prioridade/status:** P0 · PLANEJADO
- **Problema:** existem modelos `Tenant` e `TenantMembership`, mas `TenantContextGuard`, `PermissionGuard`, times e testes de acesso cruzado ainda não existem.
- **Impacto:** risco de acesso entre empresas se features organizacionais forem expostas antecipadamente.
- **Motivo do adiamento:** pertence à B2 e depende do principal autenticado da B1.6.
- **Retomada:** B2.
- **Critério de encerramento:** testes negativos provam isolamento entre tenants e escopo de Manager/CEO em repository, caso de uso e HTTP.

## 4. Problemas que bloqueiam staging ou release

### PP-004 — Retenção, exclusão e base legal sem prazos aprovados

- **Prioridade/status:** P1 · ABERTO
- **Problema:** lifecycle técnico está definido, mas prazos de retenção, anonimização, expurgo, atendimento ao titular e requisitos legais não foram aprovados.
- **Impacto:** risco de retenção excessiva ou remoção indevida de dados pessoais, privados e de auditoria.
- **Motivo do adiamento:** exige decisão jurídica e operacional, não apenas implementação.
- **Retomada:** antes de staging, no máximo em B10.
- **Critério de encerramento:** matriz por categoria de dado, base/finalidade, prazo, responsável, fluxo de exclusão e jobs testados/documentados.

### PP-005 — Aplicação e migrations usam o mesmo papel de banco

- **Prioridade/status:** P1 · ABERTO
- **Problema:** o ambiente local usa um proprietário com privilégios para migrations e runtime. A proteção append-only de `AuditEvent` não substitui privilégio mínimo contra comandos administrativos como `TRUNCATE`.
- **Impacto:** comprometimento da aplicação poderia alcançar operações de schema ou destrutivas além do necessário.
- **Motivo do adiamento:** separação de credenciais depende do desenho do ambiente hospedado.
- **Retomada:** B10, antes de staging público.
- **Critério de encerramento:** roles separadas para migration e runtime; runtime sem DDL, truncate ou bypass de constraints; testes operacionais aprovados.

### PP-006 — Secrets, chaves JWT e rotação ainda sem infraestrutura

- **Prioridade/status:** P1 · PLANEJADO
- **Problema:** ADRs definem `RS256`, `kid`, rotação e cookies, mas não existe secret manager, par de chaves por ambiente nem runbook de comprometimento.
- **Impacto:** sessão segura não pode operar fora do desenvolvimento.
- **Motivo do adiamento:** implementação começa em B1.4 e materialização operacional depende de staging.
- **Retomada:** B1.4 para contrato; B10 para operação.
- **Critério de encerramento:** chaves fora do Git, rotação ensaiada, acesso restrito, revogação e recuperação documentadas.

### PP-007 — Backup, restauração e rollback não ensaiados

- **Prioridade/status:** P1 · ABERTO
- **Problema:** migrations são reproduzíveis em banco vazio, mas não há backup automatizado, restauração ensaiada nem estratégia comprovada para falha de migration.
- **Impacto:** risco de indisponibilidade ou perda de dados durante deploy/incidente.
- **Motivo do adiamento:** requer infraestrutura de staging e provedor definidos.
- **Retomada:** B10.
- **Critério de encerramento:** RPO/RTO definidos, backup verificado, restauração e rollback/forward-fix ensaiados.

### PP-008 — Observabilidade de produção ausente

- **Prioridade/status:** P1 · PLANEJADO
- **Problema:** há logs estruturados, request ID e health checks, porém não existem agregação de erros, alertas, Sentry/staging ou procedimento de incidente.
- **Impacto:** falhas e ataques podem não ser detectados ou diagnosticados em tempo adequado.
- **Motivo do adiamento:** serviço externo não é necessário para desenvolvimento local.
- **Retomada:** B10, antes de staging público.
- **Critério de encerramento:** alertas testados, redação de dados sensíveis confirmada e runbook com responsáveis.

### PP-009 — E2E frontend versionado insuficiente

- **Prioridade/status:** P1 · ABERTO
- **Problema:** a auditoria visual usou Playwright de forma assistida, mas o repositório ainda não possui suíte E2E frontend versionada para os fluxos críticos.
- **Impacto:** regressões de navegação, persistência, responsividade e integração frontend–API dependem de auditoria manual.
- **Motivo do adiamento:** o frontend ainda usa adapters locais e os contratos HTTP não estão estáveis.
- **Retomada:** B8; ampliar em B10.
- **Critério de encerramento:** suíte Playwright versionada no CI cobrindo login, ciclo principal, privacidade e viewports críticas.

### PP-010 — Acessibilidade sem validação assistiva real

- **Prioridade/status:** P1 · ABERTO
- **Problema:** responsividade, toque e movimento reduzido foram auditados, mas faltam leitor de tela real, navegação assistiva e dispositivos físicos.
- **Impacto:** barreiras podem permanecer invisíveis aos testes automatizados e ao navegador desktop.
- **Motivo do adiamento:** requer dispositivos e validação humana dedicada.
- **Retomada:** B10.
- **Critério de encerramento:** fluxos críticos aprovados com teclado, leitor de tela e dispositivos físicos representativos.

### PP-011 — Quality Gate ainda é baseline progressiva

- **Prioridade/status:** P1 · MITIGADO
- **Problema:** CI e SonarQube Cloud estão aprovados, mas cobertura mínima ainda não bloqueia retroativamente todo o código existente.
- **Impacto:** partes legadas podem continuar com cobertura inferior ao desejado.
- **Mitigação atual:** testes obrigatórios, análise de código novo e gates funcionais por bloco.
- **Motivo do adiamento:** elevar o limiar de uma vez criaria um bloqueio sem reduzir risco de forma incremental.
- **Retomada:** B1.7 e revisões posteriores por módulo.
- **Critério de encerramento:** métricas mínimas explícitas e sustentáveis para código novo e fluxos críticos.

## 5. Dependências e cadeia de suprimentos

### PP-012 — Advisory moderado transitivo do Prisma CLI

- **Prioridade/status:** P2 · MITIGADO
- **Problema:** Prisma CLI 7.8.0 traz `@prisma/dev` → `@hono/node-server` 1.19.11, afetado pelo advisory `GHSA-92pp-h63x-v22m` em `serveStatic`.
- **Impacto:** risco limitado à ferramenta de desenvolvimento; o NestJS e o runtime do produto não usam esse servidor estático.
- **Mitigação atual:** versões fixadas, CI bloqueia vulnerabilidades altas/críticas e scripts de instalação são allowlistados; telemetria `@scarf/scarf` foi negada.
- **Motivo do adiamento:** o npm oferece apenas downgrade forçado para Prisma 6; override da dependência exata não foi aplicado de forma confiável.
- **Retomada:** assim que uma versão estável do Prisma incorporar a dependência corrigida.
- **Critério de encerramento:** `npm audit --workspaces` sem o advisory, mantendo Prisma 7 compatível e todos os gates aprovados.

### PP-013 — Verificação GPG ignorada pela action do Sonar

- **Prioridade/status:** P2 · ABERTO
- **Problema:** o GitHub Actions registra a anotação “Skipping GPG signature verification” durante o scan do SonarQube Cloud.
- **Impacto:** redução de uma camada de verificação da cadeia de suprimentos da ferramenta de análise; o workflow permanece fixado por versão major, não por SHA.
- **Motivo do adiamento:** não bloqueou o Quality Gate e exige avaliar suporte oficial/estratégia de pinning.
- **Retomada:** B1.7 ou manutenção de CI anterior.
- **Critério de encerramento:** action fixada por SHA revisado e/ou verificação suportada sem warning, com política de atualização documentada.

### PP-014 — Dependabot e CodeQL indisponíveis no fluxo atual

- **Prioridade/status:** P2 · MITIGADO
- **Problema:** recursos automáticos foram retirados devido às limitações observadas no plano/repositório privado.
- **Impacto:** menor automação para alertas e atualização de dependências.
- **Mitigação atual:** `npm audit` no CI, lockfile, versões críticas fixadas, SonarQube Cloud e revisão manual.
- **Retomada:** mudança de disponibilidade/plano ou antes do release, caso o risco residual seja considerado alto.
- **Critério de encerramento:** automação equivalente habilitada e validada sem duplicar ou enfraquecer o CI.

## 6. Dependências externas adiadas

### PP-015 — E-mail transacional ainda não selecionado

- **Prioridade/status:** P2 · PLANEJADO
- **Problema:** convites precisarão de Mailpit em desenvolvimento e de provedor transacional antes de staging.
- **Impacto:** o fluxo de entrada de membros não poderá ser validado ponta a ponta por e-mail.
- **Motivo do adiamento:** convites pertencem à B3.
- **Retomada:** Mailpit na B3; provedor antes de staging.
- **Critério de encerramento:** envio, expiração, retry, bounce e não exposição de token cobertos por testes/observabilidade.

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
