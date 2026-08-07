export const ritualSections = [
  {
    key: 'opening', tone: 'red', schedule: '07:50 — 08:05 · Abertura (15 min)', title: '🌅 Abertura do Dia de Guerra',
    items: [
      ['review-panel', 'Leitura do painel de ontem', 'Abra o painel e resolva toda célula vazia. Vazio é mentira por omissão.'],
      ['declare-behaviors', 'Declaração dos comportamentos', 'Leia em voz alta cada comportamento do dia.'],
      ['critical-behavior', 'Comportamento crítico', 'Eleja uma prioridade inegociável a partir de ontem.'],
      ['check-schedule', 'Check de agenda', 'Confirme alarmes para comportamentos com horário fixo.'],
    ],
  },
  {
    key: 'execution', tone: 'green', schedule: 'Durante o expediente · Execução em tempo real', title: '⚙ Regra de Ouro: marcou na hora, venceu o dia',
    items: [
      ['immediate-mark', 'Marcação imediata', 'Cumpriu o comportamento, marque verde na hora.'],
      ['whatsapp-30-30', 'WhatsApp 30/30', 'Use o timer. Três ciclos perdidos exigem registro vermelho.'],
      ['praise-three', 'Elogiar 3 pessoas', 'Aplique a regra 1-1-1 ao longo do dia.'],
      ['daily-feedback', 'Feedback diário', 'Faça ao menos uma conversa com fato, impacto e próximo passo.'],
      ['target-hit', 'Meta batida', 'Acompanhe o número e registre perdas em tempo real.'],
    ],
  },
  {
    key: 'closing', tone: 'gold', schedule: '17:30 — 17:50 · Fechamento (20 min)', title: '📋 Fechamento e Prestação de Contas',
    items: [
      ['audit-day', 'Auditoria da coluna do dia', 'Percorra todos os comportamentos: verde ou vermelho, sem branco.'],
      ['justify-failures', 'Justificativa de cada vermelho', 'Registre a causa real de cada desvio.'],
      ['pending-items', 'Pendências', 'Liste o que ficou pendente e o responsável por amanhã.'],
      ['lost-sales', 'Vendas perdidas', 'Registre o motivo real da perda.'],
      ['read-score', 'Leitura do placar', 'Identifique o número, a consequência e a decisão.'],
    ],
  },
  {
    key: 'weekly', tone: 'purple', schedule: 'Sexta-feira · 16:00 — 16:45', title: '⚔ Sala de Guerra Semanal',
    items: [
      ['horizontal-review', 'Leitura horizontal', 'Três vermelhos no mesmo comportamento são um padrão.'],
      ['group-justifications', 'Agrupamento de justificativas', 'Agrupe causas por processo, pessoa, sistema ou demanda.'],
      ['public-celebration', 'Celebração pública', 'Reconheça o comportamento 100% verde da semana.'],
      ['next-week-commitment', 'Compromisso da próxima semana', 'Declare por escrito a próxima meta percentual.'],
      ['weekly-backup', 'Backup semanal', 'Exporte os dados e arquive na pasta do mês.'],
    ],
  },
]

export const TIMER_SECONDS = 30 * 60
export const TOTAL_CYCLES = 8
