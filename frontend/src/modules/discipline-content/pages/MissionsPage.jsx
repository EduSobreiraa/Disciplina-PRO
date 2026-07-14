import { useMemo, useState } from 'react'
import { ritualSections } from '../../daily-ritual/data/ritual-content'
import { dailyRitualLocalRepository } from '../../daily-ritual/repositories/daily-ritual.local.repository'
import { disciplineTrackerLocalRepository } from '../../discipline-tracker/repositories/discipline-tracker.local.repository'
import { calculateTrackerStats } from '../../discipline-tracker/services/tracker-stats'
import { useGamification } from '../../gamification/gamification-context'
import { missionDefinitions } from '../data/discipline-content'
import { calculateMissionMetrics, getMissionPeriodKey } from '../services/mission-progress'
import '../styles/discipline-content.css'

export function MissionsPage() {
  const [trackerState] = useState(() => disciplineTrackerLocalRepository.load())
  const [ritualState] = useState(() => dailyRitualLocalRepository.load())
  const [now] = useState(() => new Date())
  const gamification = useGamification()
  const trackerStats = useMemo(() => calculateTrackerStats(trackerState, now.getFullYear(), now.getMonth()), [now, trackerState])
  const metrics = calculateMissionMetrics({ trackerState, trackerStats, ritualState, ritualSections, transactions: gamification.state.transactions, now })

  return <><header className="page-title"><span className="eyebrow">Objetivos derivados da execução</span><h1>Missões <em>ativas</em></h1><p>O progresso vem dos fatos já registrados. Complete a meta e resgate a recompensa uma única vez.</p></header>
    <section className="mission-grid">{missionDefinitions.map((mission) => {
      const value = metrics[mission.metric] ?? 0
      const percent = Math.min(100, Math.round(value / mission.target * 100))
      const sourceKey = `mission:${mission.id}:${getMissionPeriodKey(mission.period, now)}`
      const claimed = gamification.state.transactions.filter((item) => item.sourceKey === sourceKey).reduce((sum, item) => sum + item.amount, 0) > 0
      const complete = value >= mission.target
      return <article className={`mission-card ${mission.tone} ${complete ? 'complete' : ''}`} key={mission.id}><header><div><span>Missão {complete ? 'concluída' : 'em progresso'}</span><h2>{mission.name}</h2></div><b>{mission.icon}</b></header><p>{mission.description}</p><div className="mission-progress"><i><b style={{ width: `${percent}%` }} /></i><strong>{Math.min(value, mission.target)}/{mission.target}</strong></div><footer><span>+{mission.reward} XP</span><button disabled={!complete || claimed} type="button" onClick={() => gamification.setReward(mission.eventType, sourceKey, true)}>{claimed ? 'Recompensa resgatada' : complete ? 'Resgatar recompensa' : `${percent}% concluído`}</button></footer></article>
    })}</section>
  </>
}
