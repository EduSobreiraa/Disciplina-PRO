import { missionDefinitions } from '../data/discipline-content'
import { useMissions } from '../hooks/useMissions'
import '../styles/discipline-content.css'
import '../styles/mission-state.css'

export function MissionsPage() {
  const missions = useMissions()

  return <><header className="page-title"><span className="eyebrow">Objetivos derivados da execução</span><h1>Missões <em>ativas</em></h1><p>O progresso vem dos fatos já registrados. Complete a meta e resgate a recompensa uma única vez.</p></header>
    {missions.status === 'loading' && <section className="mission-state" role="status">Carregando missões…</section>}
    {missions.status === 'error' && <section className="mission-state error" role="alert"><strong>Não foi possível carregar as missões.</strong><span>{missions.error?.message}</span><button type="button" onClick={() => missions.reload().catch(() => {})}>Tentar novamente</button></section>}
    <section className="mission-grid">{missionDefinitions.map((mission) => {
      const value = missions.metrics[mission.metric] ?? 0
      const percent = Math.min(100, Math.round(value / mission.target * 100))
      const complete = value >= mission.target
      return <article className={`mission-card ${mission.tone} ${complete ? 'complete' : ''}`} key={mission.id}><header><div><span>Missão {complete ? 'concluída' : 'em progresso'}</span><h2>{mission.name}</h2></div><b>{mission.icon}</b></header><p>{mission.description}</p><div className="mission-progress"><i><b style={{ width: `${percent}%` }} /></i><strong>{Math.min(value, mission.target)}/{mission.target}</strong></div><footer><span>Recompensa futura</span><button disabled type="button">{complete ? 'Aguardando integração' : `${percent}% concluído`}</button></footer></article>
    })}</section>
  </>
}
