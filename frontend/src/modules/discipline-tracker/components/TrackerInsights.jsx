import { getBehaviorRanking, getScoreClass } from '../services/tracker-stats'

export function TrackerInsights({ behaviors, stats }) {
  const ranking = getBehaviorRanking(behaviors, stats.byBehavior)
  const strongest = [...ranking].sort((a, b) => b.percent - a.percent).slice(0, 5)
  const critical = [...ranking].sort((a, b) => a.percent - b.percent).slice(0, 5)
  const list = (items) => items.length ? items.map((item) => <li key={item.id}><span>{item.name}</span><div><i className={getScoreClass(item.percent)} style={{ width: `${item.percent}%` }}/></div><strong className={getScoreClass(item.percent)}>{item.percent}%</strong></li>) : <p className="tracker-empty">Marque alguns dias para formar o ranking.</p>
  return <section className="tracker-insights"><article><span className="eyebrow">Forças</span><h2>Comportamentos mais fortes</h2><ol>{list(strongest)}</ol></article><article><span className="eyebrow">Pontos de atenção</span><h2>Comportamentos críticos</h2><ol>{list(critical)}</ol></article></section>
}
