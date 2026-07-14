export const missionDefinitions = [
  { id: 'week-elite', name: 'Semana de Elite', description: 'Faça 7 dias perfeitos neste mês.', icon: '🎯', tone: 'green', target: 7, metric: 'perfectDays', eventType: 'MISSION_WEEK_ELITE', reward: 200, period: 'month' },
  { id: 'living-flame', name: 'Chama Viva', description: 'Mantenha 5 dias perfeitos seguidos.', icon: '🔥', tone: 'orange', target: 5, metric: 'perfectStreak', eventType: 'MISSION_LIVING_FLAME', reward: 150, period: 'month' },
  { id: 'elite-zone', name: 'Zona Elite', description: 'Atinja 90% de disciplina neste mês.', icon: '👑', tone: 'gold', target: 90, metric: 'monthPercent', eventType: 'MISSION_ELITE_ZONE', reward: 250, period: 'month' },
  { id: 'no-weakness', name: 'Nenhuma Fraqueza', description: 'Mantenha todos os comportamentos em 80% ou mais.', icon: '💪', tone: 'blue', target: 80, metric: 'minimumBehaviorPercent', eventType: 'MISSION_NO_WEAKNESS', reward: 180, period: 'month' },
  { id: 'xp-hunter', name: 'Caçador de XP', description: 'Conquiste 500 XP na semana atual.', icon: '⚡', tone: 'purple', target: 500, metric: 'weeklyXp', eventType: 'MISSION_XP_HUNTER', reward: 100, period: 'week' },
  { id: 'constant-presence', name: 'Presença Constante', description: 'Registre 20 dias neste mês.', icon: '📅', tone: 'green', target: 20, metric: 'markedDays', eventType: 'MISSION_CONSTANT_PRESENCE', reward: 120, period: 'month' },
  { id: 'green-hundred', name: 'Centena Verde', description: 'Acumule 100 marcações verdes.', icon: '💚', tone: 'green', target: 100, metric: 'totalGreens', eventType: 'MISSION_GREEN_HUNDRED', reward: 300, period: 'lifetime' },
  { id: 'ritual-machine', name: 'Máquina de Rituais', description: 'Complete 5 blocos de ritual.', icon: '🧠', tone: 'orange', target: 5, metric: 'completedRitualSections', eventType: 'MISSION_RITUAL_MACHINE', reward: 100, period: 'lifetime' },
]

export const scoreBands = [
  { range: '90–100%', status: 'Tarja Preta — elite', consequence: 'Reconhecimento público e registro histórico de performance.', tone: 'green' },
  { range: '75–89%', status: 'Em evolução', consequence: 'Eleger um comportamento crítico por semana para subir de faixa.', tone: 'gold' },
  { range: '< 75%', status: 'Zona de risco', consequence: 'Reunião individual e plano de correção de sete dias por escrito.', tone: 'red' },
]

export const panelLaws = [
  ['Célula vazia não existe.', 'Todo dia útil termina com todas as células marcadas. Em branco é omissão.'],
  ['Vermelho não é vergonha. Vermelho escondido é.', 'Quem registra o desvio hoje cria condições para executar melhor amanhã.'],
  ['O dono do painel é quem executa.', 'A liderança audita, mas não preenche. Autorresponsabilidade é o primeiro comportamento invisível.'],
  ['Sequência vale mais que pico.', 'Um dia perfeito isolado vale menos que dez dias consistentes.'],
  ['O painel sobe para a Sala de Guerra.', 'Toda sexta-feira, o percentual do mês orienta a conversa de gestão.'],
  ['Vermelho sem justificativa não existe.', 'Causas repetidas se transformam em plano de correção, não em desculpa.'],
]
