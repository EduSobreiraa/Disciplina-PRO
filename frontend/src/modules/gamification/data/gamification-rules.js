export const gamificationRules = {
  TRACKER_GREEN: { xp: 10, label: 'Comportamento cumprido' },
  RITUAL_STEP: { xp: 15, label: 'Etapa de ritual concluída' },
  RITUAL_SECTION: { xp: 50, label: 'Bloco de ritual concluído' },
  FOCUS_CYCLE: { xp: 25, label: 'Ciclo 30/30 concluído' },
  PROJECT_ACTIVITY: { xp: 10, label: 'Atividade do Projeto 66 concluída' },
  PROJECT_DAY: { xp: 50, label: 'Dia do Projeto 66 registrado' },
}

export const levels = [
  { level: 1, name: 'Recruta', minimum: 0, medal: '🥉' },
  { level: 2, name: 'Soldado', minimum: 500, medal: '🥈' },
  { level: 3, name: 'Elite', minimum: 1500, medal: '🥇' },
  { level: 4, name: 'Comandante', minimum: 3000, medal: '🏅' },
]

export const achievementRules = [
  { id: 'first-xp', icon: '⚡', name: 'Primeira faísca', description: 'Conquiste seus primeiros pontos.', test: ({ xp }) => xp > 0 },
  { id: 'ritual-step', icon: '🧠', name: 'Ritualizado', description: 'Conclua uma etapa de ritual.', test: ({ counts }) => counts.RITUAL_STEP > 0 },
  { id: 'focus-cycle', icon: '⏱', name: 'Foco em ciclo', description: 'Conclua um ciclo 30/30.', test: ({ counts }) => counts.FOCUS_CYCLE > 0 },
  { id: 'project-day', icon: '🔥', name: 'Dia de comando', description: 'Registre um dia no Projeto 66.', test: ({ counts }) => counts.PROJECT_DAY > 0 },
  { id: 'xp-500', icon: '🏆', name: 'Soldado', description: 'Alcance 500 XP.', test: ({ xp }) => xp >= 500 },
]
