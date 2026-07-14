export const gamificationRules = {
  TRACKER_GREEN: { xp: 10, label: 'Comportamento cumprido' },
  RITUAL_STEP: { xp: 15, label: 'Etapa de ritual concluída' },
  RITUAL_SECTION: { xp: 50, label: 'Bloco de ritual concluído' },
  FOCUS_CYCLE: { xp: 25, label: 'Ciclo 30/30 concluído' },
  PROJECT_ACTIVITY: { xp: 10, label: 'Atividade do Projeto 66 concluída' },
  PROJECT_DAY: { xp: 50, label: 'Dia do Projeto 66 registrado' },
  MISSION_WEEK_ELITE: { xp: 200, label: 'Missão concluída: Semana de Elite' },
  MISSION_LIVING_FLAME: { xp: 150, label: 'Missão concluída: Chama Viva' },
  MISSION_ELITE_ZONE: { xp: 250, label: 'Missão concluída: Zona Elite' },
  MISSION_NO_WEAKNESS: { xp: 180, label: 'Missão concluída: Nenhuma Fraqueza' },
  MISSION_XP_HUNTER: { xp: 100, label: 'Missão concluída: Caçador de XP' },
  MISSION_CONSTANT_PRESENCE: { xp: 120, label: 'Missão concluída: Presença Constante' },
  MISSION_GREEN_HUNDRED: { xp: 300, label: 'Missão concluída: Centena Verde' },
  MISSION_RITUAL_MACHINE: { xp: 100, label: 'Missão concluída: Máquina de Rituais' },
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
