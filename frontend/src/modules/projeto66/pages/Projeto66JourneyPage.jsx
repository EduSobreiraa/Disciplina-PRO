import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'
import { useState } from 'react'
import { getProjeto66Phases } from '../data/projeto66-content'

export function Projeto66JourneyPage() {
  const { durationDays } = useProjeto66Cycle()
  const projeto66Phases = getProjeto66Phases(durationDays)
  const [active, setActive] = useState(1)
  const phase = projeto66Phases.find((item) => item.id === active)
  return <><header className="p66-page-title"><span>Joe Dispenza × D.D.P.</span><h1>Protocolo</h1></header><div className="p66-segments">{projeto66Phases.map((item) => <button className={active === item.id ? 'active' : ''} key={item.id} onClick={() => setActive(item.id)} style={{ '--phase': item.color }}>Fase {item.id}</button>)}</div><section className="p66-phase-intro" style={{ '--phase': phase.color }}><span>{phase.range}</span><h2>{phase.name}</h2><p>{phase.description}</p></section><div className="p66-activities">{phase.activities.map((activity) => <article key={activity.title}><span>Dia {activity.days}</span><div><small>{activity.tag}</small><h3>{activity.title}</h3><p>{activity.focus}</p></div></article>)}</div></>
}
