# Relatório técnico de progresso

> Disciplina PRO · Spark Inteligência Corporativa
> Atualizado em 14/07/2026 · Estado: frontend individual F0–F9 concluído

## 1. Visão geral do produto

O Disciplina PRO é uma plataforma B2B SaaS multi-tenant para execução de programas de desenvolvimento e acompanhamento de adesão comportamental. O Projeto 66 é o primeiro programa da plataforma e mantém domínio, navegação e identidade visual próprios.

```text
Disciplina PRO
├── organizações, times e membros
├── catálogo e programas habilitados
├── execução individual
├── tracker comportamental e rituais
├── gamificação
├── relatórios de adesão
└── auditoria
    └── Projeto 66 (primeiro programa)
```

O frontend individual foi migrado dos protótipos HTML para React. A fundação B0 do backend NestJS foi iniciada; schema Prisma, módulos de negócio e áreas administrativas B2B ainda serão implementados.

## 2. Tecnologias e decisões

| Área | Tecnologia/decisão |
|---|---|
| Frontend | React 19, JavaScript ESM, React Router 7 |
| Build | Vite 8 |
| Qualidade | ESLint 10, `node:test`, Playwright |
| Estilos | CSS por módulo, tokens e media queries mobile-first |
| Persistência atual | repositories sobre `localStorage`, temporários |
| Backend planejado | NestJS + TypeScript |
| ORM/banco | Prisma + PostgreSQL |
| Arquitetura backend | monolito modular em camadas |
| Multi-tenancy | banco compartilhado com isolamento obrigatório por `tenantId` |
| Comunicação futura | API REST e eventos internos do monolito |

Decisões estruturais relevantes:

- Projeto 66 não é o núcleo da plataforma; é um programa global habilitado por tenant.
- Role empresarial pertence a `TenantMembership`, não a `User`.
- Autorização combina role e escopo do recurso.
- Controllers futuros adaptam HTTP; não acessam Prisma nem acumulam regras.
- Conteúdo íntimo não aparece em reporting, auditoria ou metadata.
- Fatos são persistidos; percentuais, streaks, níveis e métricas são derivados.
- Gamificação utiliza transações de XP, não apenas um saldo mutável.
- Microserviços, filas externas, billing, IA e customização de programas estão fora do MVP atual.

## 3. Tipo de codificação aplicado

A migração não copiou os HTMLs como componentes monolíticos. Cada fatia foi dividida por responsabilidade:

```text
modules/<domínio>/
├── components/       apresentação reutilizável dentro do domínio
├── data/             conteúdo e regras declarativas
├── hooks/            coordenação de estado e casos de uso locais
├── pages/            composição das rotas
├── repositories/     adapters de persistência
├── services/         cálculos puros e regras derivadas
└── styles/           identidade visual do módulo
```

Práticas adotadas:

- componentes funcionais e composição;
- estado React em vez de manipulação direta do DOM;
- funções puras para cálculos relevantes;
- repositories impedindo acesso direto ao armazenamento pelos componentes;
- contratos e limites que permitem trocar `localStorage` por API;
- eventos/recompensas identificados por chaves idempotentes;
- transações compensatórias ao desfazer fatos que concederam XP;
- CSS mobile-first e identidades visuais separadas;
- acessibilidade semântica básica: headings, labels, `aria-pressed`, status e alvos de toque;
- mudanças pequenas, documentadas, testadas e versionadas.

## 4. Progresso por feature

### F0 — Fundação

- shell do Disciplina PRO;
- rotas principais e sessão simulada;
- dashboard, perfil e catálogo;
- entrada e retorno do Projeto 66;
- realinhamento à estética “sala de guerra”.

### F1 — Estrutura do Projeto 66

- layout e rotas aninhadas;
- navegação inferior;
- conteúdo das três fases;
- repository local e estado inicial do ciclo;
- tema iOS/fogo isolado da plataforma.

### F2 — Progresso do Projeto 66

- dia corrente e progresso de 66 dias;
- streak atual e melhor streak;
- progresso por fase;
- heatmap e gráfico de pontuação;
- médias e melhor placar.

### F3 — Registro diário

- seis pilares e placar derivado;
- missões objetivas do dia;
- registro idempotente por `programDay`;
- emoção e gratidão em repository privado separado;
- atualização de progresso e indicadores.

### F4 — Checklist do Projeto 66

- manhã, período do dia e noite;
- progresso por seção e total;
- Dia de Comando;
- persistência e reset confirmado por dia.

### F5 — Ferramentas privadas

- meditação e temporizador resistente a variação de intervalos;
- Novo Eu e check-in pessoal;
- modo crise e respiração;
- registro de dia difícil;
- armazenamento privado separado.

### F6 — Tracker comportamental

- comportamentos configuráveis e limite de 20 ativos;
- grade mensal com rolagem e coluna fixa;
- ciclo vazio, verde e vermelho;
- justificativa e central de pendências;
- rankings, KPIs, dias perfeitos e backup validado.

### F7 — Ritual diário

- abertura, execução, fechamento e revisão semanal;
- fatos persistidos por data e etapa;
- timer 30/30 com oito ciclos;
- pausa, retomada após reload e reset;
- conclusão idempotente dos blocos.

### F8 — Gamificação

- ledger append-only de XP;
- saldo, nível e progresso derivados;
- integrações com tracker, ritual e Projeto 66;
- compensações ao desfazer ações;
- conquistas persistidas como fatos;
- histórico de transações e header dinâmico.

### F9 — Missões e protocolo

- oito missões derivadas do tracker, ritual e ledger;
- períodos mensais, semanais e vitalícios;
- resgate de recompensa idempotente;
- critérios de pontuação;
- seis leis do painel;
- conteúdo migrado sem criar fonte paralela de XP.

## 5. Rotas atuais

Plataforma:

```text
/login
/app
/app/ritual
/app/missoes
/app/programas
/app/minha-evolucao
/app/conquistas
/app/protocolo
/app/perfil
```

Projeto 66:

```text
/app/programas/projeto66
/app/programas/projeto66/hoje
/app/programas/projeto66/registrar
/app/programas/projeto66/meditar
/app/programas/projeto66/novo-eu
/app/programas/projeto66/jornada
/app/programas/projeto66/progresso
```

## 6. Persistência e privacidade atuais

O frontend utiliza chaves locais separadas para tracker, ritual, ciclo do Projeto 66, conteúdo privado e gamificação. Componentes não acessam `localStorage` diretamente.

Essa separação oferece um bom limite arquitetural, mas não constitui segurança de produção. `localStorage` é legível pelo navegador e será substituído por APIs autenticadas. O backend deverá garantir a privacidade nos modelos, casos de uso, DTOs e queries, independentemente do que a interface exiba.

## 7. Procedimento de criação

Cada feature seguiu este ciclo:

1. leitura do protótipo e inventário de conteúdo, estado e regras;
2. definição do ownership e do limite de domínio;
3. extração de regras para funções puras;
4. criação do repository/adaptador de persistência;
5. criação de hook coordenador;
6. composição de componentes e página;
7. CSS mobile-first preservando a estética original;
8. integração às rotas e demais módulos;
9. testes unitários das regras;
10. teste funcional e responsivo no navegador;
11. lint, build, revisão de diff e documentação;
12. commit descritivo e push para `main`.

## 8. Estratégia e procedimentos de teste

### Testes unitários

São executados com `node:test` e `assert/strict`. Cobrem atualmente:

- estatísticas, rankings e backup do tracker;
- progresso, streak e pontuação do Projeto 66;
- progresso e timer do ritual;
- ledger, compensações, níveis e conquistas;
- períodos, sequência e métricas de missões.

Comando:

```bash
cd frontend
npm test
```

### Análise estática

O ESLint verifica JavaScript, JSX e regras de hooks React:

```bash
npm run lint
```

### Build de produção

O Vite transforma e empacota todos os módulos para detectar imports, sintaxe e integração quebrados:

```bash
npm run build
```

### Testes funcionais no navegador

Playwright é utilizado para:

- navegar pelas rotas;
- executar ações reais;
- recarregar a página e verificar persistência;
- validar idempotência e compensações;
- inspecionar erros de console;
- medir overflow horizontal;
- identificar controles menores que 44 px;
- capturar telas para inspeção visual.

Matriz responsiva adotada:

| Perfil | Viewport |
|---|---:|
| móvel mínimo | 320×568 |
| móvel de referência | 375×812 |
| tablet | 768×1024 |
| desktop | 1440×900 |

### Critério de aceite

Uma feature visual é encerrada somente após fluxo funcional, persistência, responsividade, console, lint, testes e build serem aprovados. A documentação é atualizada no mesmo commit.

## 9. Princípios de produto e engenharia

- **Mobile-first:** toque e telas pequenas são a base.
- **Fidelidade visual:** as duas identidades não são fundidas em um tema genérico.
- **Separação de responsabilidades:** apresentação, coordenação, domínio e persistência têm limites explícitos.
- **Fatos antes de agregados:** métricas podem ser recalculadas.
- **Idempotência:** reload, edição ou repetição não duplica efeitos.
- **Privacidade por desenho:** gestão acompanha adesão, não conteúdo íntimo.
- **Multi-tenancy por desenho:** toda futura query empresarial terá `tenantId` estabelecido pelo contexto autenticado.
- **Autorização por role e escopo:** Manager não obtém acesso global por possuir apenas a role.
- **Monolito modular:** simplicidade operacional sem perder ownership dos domínios.
- **Documentação viva:** arquitetura e migração acompanham o código.
- **Evolução incremental:** protótipos são migrados em fatias verificáveis.

## 10. Estado real e limitações

Concluído: experiência individual local dos protótipos, modularizada e responsiva.

Ainda não concluído:

- autenticação e autorização reais;
- tenants, memberships, times e convites;
- API, Prisma e PostgreSQL;
- gestão empresarial e Super Admin;
- relatórios por time/tenant e auditoria real;
- sincronização entre dispositivos;
- proteção server-side de dados privados;
- suíte E2E versionada no pipeline;
- validação final com leitores de tela e dispositivos físicos.

Os dados e recompensas atuais são locais e simulam contratos futuros. Não devem ser tratados como produção.

## 11. Próxima etapa: backend

A recomendação é iniciar o backend antes das telas administrativas. Ordem proposta:

1. workspace NestJS, configuração, validação e tratamento de erros;
2. Prisma e PostgreSQL;
3. `identity-access` e sessão;
4. `organizations` e isolamento multi-tenant;
5. `invitations`;
6. catálogo `programs` e habilitação por tenant;
7. `execution` e Projeto 66 por contrato genérico;
8. `gamification` com `XpTransaction` e `UserAchievement`;
9. `audit` e `reporting`;
10. troca progressiva dos repositories locais por adapters HTTP.

Antes do schema definitivo, ainda devem ser fechados `ProgramVersion`, `EnrollmentPause`, estados de membership e representação de `SUPER_ADMIN`.

## 12. Conclusão

O frontend individual deixou de ser um conjunto de protótipos HTML e passou a ser uma aplicação React modular, testável, responsiva e preparada para integração. A F9 encerra a migração funcional planejada dos protótipos. O próximo ganho estrutural vem do backend multi-tenant, que substituirá simulações locais e permitirá iniciar as áreas B2B de gestão, relatórios e auditoria.
