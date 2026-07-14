# Inventário e Plano de Migração dos Protótipos

> Disciplina PRO · Documento operacional  
> Criado em: 12/07/2026 · Estado: inventário inicial concluído

## 1. Objetivo

Desmontar os protótipos `frontend/disciplina-pro.html` e `frontend/protocolo_66_ios (1).html` em uma aplicação React modular, preservando comportamento e identidade visual sem transportar a arquitetura monolítica, manipulação direta do DOM ou dependência direta de `localStorage` para os componentes.

Os HTMLs permanecem intactos como baseline visual e funcional até a conclusão e validação de cada fatia migrada.

## 2. Regras da migração

1. Migrar uma fatia funcional completa por vez.
2. Separar apresentação, estado, regras derivadas e persistência.
3. Não compartilhar componentes apenas por semelhança visual; extrair para `shared` somente após reutilização comprovada.
4. Não usar `document.querySelector`, `innerHTML` ou atributos `onclick` no React.
5. Não acessar `localStorage` dentro de componentes.
6. Manter conteúdo privado separado dos dados objetivos de adesão.
7. Cobrir funções puras de cálculo com testes quando forem extraídas.
8. Comparar a fatia migrada com o protótipo antes de encerrar sua migração.
9. Preservar a identidade visual original de cada protótipo, incluindo paleta, tipografia, densidade, hierarquia, animações, estados e sensação geral de uso.
10. Projetar mobile-first: toque e telas pequenas são a base; tablet e desktop são aprimoramentos progressivos.

## 2.1 Direção visual obrigatória

As duas identidades coexistirão sem serem fundidas em um tema genérico:

- **Disciplina PRO/plataforma:** linguagem escura de “sala de guerra”, preto, carvão, grafite, vermelho, verde e ouro; tipografia forte, dados densos e feedback de performance.
- **Projeto 66:** linguagem mobile inspirada em iOS, superfícies escuras, laranja/fogo e dourado, cards arredondados, navegação e interações focadas na jornada pessoal.

Componentes compartilhados podem reutilizar estrutura e acessibilidade, mas cada domínio poderá aplicar sua própria camada visual. A extração para React não autoriza redesenho silencioso.

O shell criado na F0 é provisório. Antes de ser considerado visualmente concluído, deverá ser realinhado à estética do `disciplina-pro.html`. A página inicial e as telas internas do Projeto 66 deverão ser realinhadas ao `protocolo_66_ios (1).html` durante F1 e F2.

## 3. Inventário — Disciplina PRO legado

Arquivo de origem: `frontend/disciplina-pro.html` (981 linhas).

### 3.1 Áreas visuais

| Área | Responsabilidade atual | Destino proposto |
|---|---|---|
| Header/tarja | identidade, usuário, data, nível e barra de XP | `shared/components/AppHeader` e gamificação |
| Streak banner | sequência atual e feedback | dashboard/evolução |
| Navegação por abas | Dashboard, Ritual, Missões, Conquistas e Protocolo | rotas da plataforma ou módulo correspondente |
| KPIs | disciplina mensal/anual, XP e sequência | dashboard/reporting pessoal |
| Seletor de mês | navegação temporal | `discipline-tracker` |
| Painel de comportamentos | grade diária verde/vermelho/vazio | `discipline-tracker` |
| Rankings | melhores e piores comportamentos | reporting pessoal |
| Justificativas | causa de marca vermelha | registro objetivo com política de privacidade definida |
| Ritual do dia | abertura, execução, fechamento e semanal | programa/módulo de rotina a definir |
| Timer 30/30 | oito ciclos de foco | componente de execução/foco |
| Missões | metas e recompensas | gamificação/programa |
| Conquistas | catálogo de badges e progresso | gamificação |
| Protocolo | regras e faixas de disciplina | conteúdo informativo |
| Modal de justificativa | criação/edição de causa | componente do tracker |
| Toasts | feedback de XP, badge, streak e falha | `shared/components/Toast` |

### 3.2 Estado encontrado

```text
nome
comportamentos[]
marcas[12]
justificativas[12]
xp
xpSemana
badges[]
badgeDatas{}
rituaisCompletos
checks{abertura, execucao, fechamento, semanal}
mesAtivo
timerSecs
cicloAtual
```

Persistência atual: uma chave `localStorage`, `disciplinaPRO2026`, com fallback em memória.

### 3.3 Regras e cálculos a extrair

- estatísticas por mês e globais;
- sequência atual e melhor sequência;
- percentual anual e melhor mês;
- desempenho por comportamento;
- nível por faixa de XP;
- concessão de XP;
- elegibilidade de badges e missões;
- conclusão de rituais;
- ciclo das marcas `vazio → verde → vermelho → vazio`;
- limite de 20 comportamentos;
- importação e exportação.

### 3.4 Limite de domínio pendente

O tracker comportamental do Disciplina PRO legado não será automaticamente tratado como núcleo da plataforma. Antes de migrá-lo, será decidido se ele constitui:

- um programa Spark próprio;
- uma capacidade transversal de acompanhamento pessoal; ou
- uma ferramenta específica de determinados programas.

Essa decisão não bloqueia a migração do shell nem do Projeto 66.

## 4. Inventário — Projeto 66

Arquivo de origem: `frontend/protocolo_66_ios (1).html` (2.826 linhas).

### 4.1 Telas e destinos

| Tela no protótipo | Responsabilidade | Componentes candidatos |
|---|---|---|
| `home` | progresso, streak, KPIs, pilares, fases, heatmap e gráfico | `ProgramOverviewPage`, `ProgressRing`, `KpiGrid`, `PillarGauges`, `PhaseProgress`, `Heatmap`, `ScoreChart` |
| `check` | checklist diário por período | `DailyChecklistPage`, `ChecklistSection`, `ChecklistItem`, `ChecklistProgress` |
| `proto` | conteúdo das três fases e atividades | `JourneyPage`, `PhaseTabs`, `JourneyActivityCard` |
| `reg` | registro do dia, missões, pilares, emoção, gratidão e placar | `DailyRecordPage`, `DailyMissions`, `PillarSliders`, `EmotionPicker`, `GratitudeFields`, `LiveScore` |
| `personalizar` | perfil, pilares, checklist, missões, protocolo e frases | fora do MVP empresarial; preservar como referência |
| `tracker` | 66 dias, métricas, heatmap e histórico | `TrackerPage`, componentes analíticos compartilhados no módulo |
| `med` | meditação, respiração, estado emocional e histórico | `MeditationPage`, `BreathingGuide`, `MeditationTimer`, `MeditationHistory` |
| `novoeu` | definição pessoal, check diário e histórico | `NewSelfPage`, `IdentityStatement`, `IdentityCheckIn`, `PrivateHistory` |
| crise | overlay de regulação imediata | `CrisisSupportDialog`, `BreathingGuide` |
| dia difícil | registro de dificuldade | `DifficultDaySheet` |
| navegação inferior | troca de telas | substituída por rotas aninhadas do programa |
| toast | feedback de ações | serviço/componente compartilhado |

### 4.2 Estado encontrado

```text
TD      conclusão dos dias
SD      registros e pontuações diárias
MEDH    histórico de meditações
NEUH    histórico do Novo Eu
DIFH    crises e dias difíceis
NEUDEF  definição privada do Novo Eu
CFG     configuração de perfil, pilares, checklists, missões, protocolo e frases
```

Persistência atual:

| Chave | Conteúdo |
|---|---|
| `p66t4` | conclusão dos dias |
| `p66s4` | registros diários |
| `p66m4` | meditações |
| `p66n4` | checks do Novo Eu |
| `p66d4` | crises e dias difíceis |
| `p66nd4` | definição do Novo Eu |
| `p66cfg4` | personalização geral |

### 4.3 Regras e cálculos a extrair

- progresso de 0 a 66 dias;
- fases 1–22, 23–44 e 45–66;
- cálculo de streak atual e máximo;
- médias dos seis pilares;
- placar diário derivado dos sliders;
- métricas dos últimos sete registros;
- progresso por fase;
- checklist diário e percentual concluído;
- salvamento único do registro por dia do programa;
- meditação e temporizador de respiração;
- registros de crise e dia difícil;
- heatmap, gráfico e histórico;
- importação, exportação e reset da configuração.

### 4.4 Classificação de privacidade

| Dados objetivos/gerenciais | Dados privados |
|---|---|
| ciclo iniciado, dia atual e último registro | gratidão |
| atividades e checklists concluídos | relatos emocionais |
| pontuações numéricas de pilares, conforme política final | texto de meditação |
| progresso, streak, XP e conquistas | definição e histórico do Novo Eu |
| inatividade e percentual de adesão | conteúdo de crise e dia difícil |

Os endpoints gerenciais nunca devem carregar campos privados, mesmo que o frontend simplesmente deixe de exibi-los.

## 5. Arquitetura alvo do módulo Projeto 66

```text
src/modules/projeto66/
├── components/
│   ├── checklist/
│   ├── charts/
│   ├── meditation/
│   ├── progress/
│   └── records/
├── data/
│   └── projeto66-content.js
├── hooks/
├── pages/
│   ├── ProgramOverviewPage.jsx
│   ├── DailyChecklistPage.jsx
│   ├── JourneyPage.jsx
│   ├── DailyRecordPage.jsx
│   ├── TrackerPage.jsx
│   ├── MeditationPage.jsx
│   └── NewSelfPage.jsx
├── repositories/
│   ├── projeto66.repository.js
│   └── projeto66.local.repository.js
├── services/
│   ├── progress.js
│   ├── scoring.js
│   └── streak.js
├── styles/
│   ├── projeto66.tokens.css
│   └── projeto66.css
└── projeto66.routes.jsx
```

O repository local é uma ponte temporária. Futuramente, `projeto66.api.repository.js` implementará o mesmo contrato sem exigir mudanças nos componentes.

## 6. Estratégia de CSS

Três níveis:

```text
shared/styles/
├── reset.css
├── tokens.css
└── utilities.css

app/layouts/
└── shell.css

modules/<modulo>/styles/
└── estilos pertencentes ao domínio
```

- tokens globais: tipografia, espaçamento, raios e cores da plataforma;
- tokens do Projeto 66: identidade visual específica do programa;
- estilos de layout permanecem próximos do módulo responsável;
- evitar um único `App.css` crescente;
- evitar estilos inline, salvo valores genuinamente dinâmicos.
- preservar animações e microinterações que comuniquem estado, respeitando `prefers-reduced-motion`;
- manter os nomes e valores visuais relevantes como tokens do domínio, evitando aproximar cores ou tipografias sem necessidade;
- validar desktop e mobile contra os respectivos protótipos.

## 7. Fatias de migração e ordem

### F0 — Fundação (concluída)

- shell da plataforma;
- rotas principais;
- contexto simulado;
- catálogo de programas;
- página de entrada do Projeto 66.

Realinhamento visual concluído em 12/07/2026:

- Disciplina PRO estabelecido como interface inicial da plataforma;
- shell reformulado com a estética “sala de guerra” do protótipo;
- tarja, navegação, painel de XP, KPIs e catálogo adaptados para React;
- acesso ao Projeto 66 mantido pelo dashboard e pelo catálogo;
- retorno explícito do Projeto 66 para o Disciplina PRO;
- identidades visuais da plataforma e do programa mantidas separadas.

### F1 — Estrutura interna do Projeto 66 (concluída)

- layout e rotas aninhadas;
- tokens visuais do programa;
- conteúdo estático das três fases;
- repository local e modelo inicial de estado.

Critério de aceite: navegar entre Visão geral, Hoje, Jornada e Progresso sem manipulação direta do DOM.

Implementado em 12/07/2026:

- rota pai e layout imersivo do programa;
- rotas Visão geral, Checklist, Jornada e Tracker;
- tokens e estilos iOS/fogo derivados do protótipo;
- conteúdo estático integral das três fases;
- modelo inicial de ciclo e repository local isolado;
- funções iniciais de dia e fase do programa;
- estados responsivos e suporte a `prefers-reduced-motion`.

### F2 — Visão geral e tracker (concluída)

- progresso de 66 dias;
- KPIs, fases, heatmap e streak;
- funções puras de progresso e sequência.

Implementado em 12/07/2026:

- dia corrente derivado de `startedAt` e dias pausados;
- percentual geral e progresso das três fases;
- sequência atual e melhor sequência;
- média dos sete últimos registros e melhor placar;
- heatmap alimentado por `DailyRecord` local;
- gráfico SVG de evolução do placar;
- estados vazios para ciclos sem registros;
- testes automatizados das regras derivadas usando `node:test`.

### F3 — Registro diário (concluída)

- missões, pilares e placar;
- submissão idempotente do dia;
- separação explícita entre dados objetivos e privados.

Implementado em 12/07/2026:

- seis pilares com escala de 0 a 10 e placar ao vivo de 0 a 60;
- três missões diárias objetivas;
- seleção de frequência emocional e três registros de gratidão;
- persistência idempotente por `programDay`;
- conclusão do dia refletida em progresso, heatmap, streak e gráficos;
- conteúdo íntimo armazenado por repository e chave separados;
- bloqueio do registro antes do início do ciclo;
- edição do registro existente no mesmo dia;
- teste automatizado do cálculo e limites da pontuação.

### F4 — Checklist (concluída)

- períodos manhã/dia/noite;
- progresso diário;
- vínculo com atividades do programa.

Implementado em 12/07/2026:

- checklist persistido por `programDay`;
- grupos de manhã, durante o dia e noite;
- progresso geral e por período;
- regra de Dia de Comando com dez ou mais itens;
- estado de checklist completo;
- reset confirmado apenas do dia atual;
- bloqueio antes do início do ciclo;
- interação mobile-first com alvos de toque e feedback imediato;
- teste automatizado do progresso e da regra de comando.

### F5 — Ferramentas privadas (concluída)

- meditação;
- Novo Eu;
- crise e dia difícil;
- políticas de armazenamento e exposição validadas.

Implementado em 12/07/2026:

- meditação com modos de 5, 10 e 15 minutos;
- temporizador baseado em horário final, resistente à variação dos intervalos do navegador;
- animação respiratória com suporte a movimento reduzido;
- histórico privado de meditações;
- definição pessoal e check-in do Novo Eu;
- registro privado de dia difícil;
- modo crise disponível globalmente no programa;
- histórico privado de resultado e respirações no modo crise;
- navegação inferior rolável e mobile-first para todas as ferramentas;
- repository privado v2 separado do ciclo e dos relatórios objetivos.

### F6 — Disciplina PRO legado (em andamento)

- decidir o limite de domínio do tracker;
- migrar painel, rituais, missões e conquistas conforme a decisão;
- reutilizar gamificação e reporting sem acoplamento ao Projeto 66.

Decisão e primeira fatia implementadas em 12/07/2026:

- tracker comportamental definido como capacidade transversal da plataforma;
- rota `Minha evolução` conectada ao tracker;
- comportamentos padrão, inclusão, renomeação e remoção lógica;
- limite de 20 comportamentos ativos;
- grade mensal com coluna fixa e rolagem horizontal mobile-first;
- ciclo `vazio → verde → vermelho → vazio`;
- justificativa obrigatoriamente solicitada ao marcar vermelho;
- KPIs do mês e percentual por comportamento;
- repository local e cálculos puros com testes.

Pendências da F6:

- lista e edição de justificativas existentes;
- rankings de comportamentos;
- resumo por dia e dias perfeitos;
- importação e exportação;
- integração futura com gamificação e API.

## 8. Próximo incremento de implementação

O próximo incremento de código será a F6:

1. fechar o limite de domínio do tracker comportamental legado;
2. extrair o painel mensal, comportamentos e marcas;
3. migrar justificativas e estatísticas;
4. preservar a estética de sala de guerra;
5. adaptar a grade densa para uso mobile-first;
6. manter persistência atrás de repository;
7. validar regras, lint, testes, build e navegação.

## 9. Matriz de validação

Para cada fatia:

- [ ] visual comparado com o protótipo;
- [ ] paleta, tipografia, espaçamento, estados e microinterações preservados;
- [ ] comportamento comparado com o protótipo;
- [ ] estado não depende do DOM;
- [ ] persistência isolada por repository;
- [ ] privacidade revisada;
- [ ] responsividade verificada;
- [ ] fluxo validado primeiro em viewport móvel e sem dependência de hover;
- [ ] lint aprovado;
- [ ] build aprovado;
- [ ] arquitetura e este inventário atualizados.
