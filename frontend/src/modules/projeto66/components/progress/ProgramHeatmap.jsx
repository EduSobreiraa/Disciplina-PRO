import { getHeatLevel, getScore } from '../../services/scoring'

export function ProgramHeatmap({ dailyRecords, currentDay = 0 }) {
  const days = Array.from({ length: 66 }, (_, index) => {
    const day = index + 1
    const score = getScore(dailyRecords[day])
    return { day, score, level: getHeatLevel(score) }
  })
  return (
    <>
      <div className="p66-heatmap" aria-hidden="true">{days.map(({ day, score, level }) => <span className={`${level} ${day === currentDay ? 'current' : ''}`} key={day} title={`Dia ${day}${score === null ? ': pendente' : `: ${score} pontos`}`}>{day}</span>)}</div>
      <details className="p66-data-alternative"><summary>Ver dados do mapa em texto</summary><ol>{days.map(({ day, score }) => <li key={day}>Dia {day}: {score === null ? 'pendente' : `${score} pontos`}{day === currentDay ? ' (dia atual)' : ''}</li>)}</ol></details>
    </>
  )
}
