export function ScoreLineChart({ records }) {
  if (!records.length) return <div className="p66-chart-empty">Registre seu primeiro placar para iniciar a linha de evolução.</div>
  const points = records.map((record, index) => {
    const x = records.length === 1 ? 50 : 5 + (index / (records.length - 1)) * 90
    const y = 92 - (Math.min(60, Math.max(0, record.score)) / 60) * 78
    return { ...record, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${polyline} ${points.at(-1).x},96 ${points[0].x},96`
  return (
    <div className="p66-chart" aria-label="Evolução do placar diário">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <defs><linearGradient id="score-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b00" stopOpacity=".35"/><stop offset="1" stopColor="#ff6b00" stopOpacity="0"/></linearGradient></defs>
        <polygon points={area} fill="url(#score-area)" />
        <polyline points={polyline} fill="none" stroke="#ff6b00" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((point) => <circle key={point.day} cx={point.x} cy={point.y} r="1.7" fill="#ffd60a"><title>Dia {point.day}: {point.score}</title></circle>)}
      </svg>
      <div><span>Dia {points[0].day}</span><span>Dia {points.at(-1).day}</span></div>
    </div>
  )
}
