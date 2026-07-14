import { achievementRules } from '../data/gamification-rules'
import { useGamification } from '../gamification-context'
import '../styles/gamification.css'

export function GamificationPage() {
  const gamification = useGamification()
  const unlocked = new Map(gamification.state.achievements.map((item) => [item.achievementId, item]))
  return <><header className="page-title"><span className="eyebrow">Progresso que deixa rastro</span><h1>Conquistas e <em>XP</em></h1><p>Cada ponto nasce de uma ação registrada. Nenhum saldo é alterado sem uma transação.</p></header>
    <section className="game-level-card"><span>{gamification.level.medal}</span><div><small>Nível {gamification.level.level}</small><h2>{gamification.level.name}</h2><p><strong>{gamification.xp} XP</strong>{gamification.nextLevel ? ` · faltam ${gamification.nextLevel.minimum - gamification.xp} para ${gamification.nextLevel.name}` : ' · nível máximo atual'}</p><i><b style={{ width: `${gamification.progress}%` }} /></i></div></section>
    <h2 className="game-section-title">Conquistas</h2><section className="achievement-grid">{achievementRules.map((achievement) => <article className={unlocked.has(achievement.id) ? 'unlocked' : ''} key={achievement.id}><b>{achievement.icon}</b><div><span>{unlocked.has(achievement.id) ? 'Desbloqueada' : 'Bloqueada'}</span><h3>{achievement.name}</h3><p>{achievement.description}</p></div></article>)}</section>
    <h2 className="game-section-title">Histórico de XP</h2><section className="xp-history">{[...gamification.state.transactions].reverse().slice(0, 30).map((item) => <article key={item.id}><span className={item.amount > 0 ? 'positive' : 'negative'}>{item.amount > 0 ? '+' : ''}{item.amount} XP</span><div><strong>{item.description}</strong><small>{new Date(item.occurredAt).toLocaleString('pt-BR')}</small></div></article>)}{gamification.state.transactions.length === 0 && <p>Nenhuma transação ainda. Conclua uma ação no tracker, ritual ou Projeto 66.</p>}</section>
  </>
}
