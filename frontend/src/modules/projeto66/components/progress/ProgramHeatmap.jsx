import { PROGRAM_LENGTH } from '../../services/progress'
import { getHeatLevel, getScore } from '../../services/scoring'

function scoreDescription(score) {
  return score === null ? 'pendente' : `${score} pontos`
}

function heatmapTitle(day, score) {
  return `Dia ${day}: ${scoreDescription(score)}`
}

export function ProgramHeatmap({ dailyRecords, currentDay = 0, durationDays = PROGRAM_LENGTH }) {
  const days = Array.from({ length: durationDays }, (_, index) => {
    const day = index + 1
    const score = getScore(dailyRecords[day])
    return { day, score, level: getHeatLevel(score) }
  })
  return (
    <>
      <div className="p66-heatmap" aria-hidden="true">{days.map(({ day, score, level }) => <span className={`${level} ${day === currentDay ? 'current' : ''}`} key={day} title={heatmapTitle(day, score)}>{day}</span>)}</div>
      <details className="p66-data-alternative"><summary>Ver dados do mapa em texto</summary><ol>{days.map(({ day, score }) => <li key={day}>Dia {day}: {scoreDescription(score)}{day === currentDay ? ' (dia atual)' : ''}</li>)}</ol></details>
    </>
  )
}
