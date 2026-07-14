import { getHeatLevel, getScore } from '../../services/scoring'

export function ProgramHeatmap({ dailyRecords, currentDay = 0 }) {
  return (
    <div className="p66-heatmap" aria-label="Mapa de calor dos 66 dias">
      {Array.from({ length: 66 }, (_, index) => {
        const day = index + 1
        const score = getScore(dailyRecords[day])
        const level = getHeatLevel(score)
        return <span className={`${level} ${day === currentDay ? 'current' : ''}`} key={day} title={`Dia ${day}${score === null ? ': pendente' : `: ${score} pontos`}`}>{day}</span>
      })}
    </div>
  )
}
