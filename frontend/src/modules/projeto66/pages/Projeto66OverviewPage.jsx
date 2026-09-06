import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'

function currentPhase(day) {
  if (!day || day <= 22) return 1
  return day <= 44 ? 2 : 3
}

function startButtonLabel(starting, startError) {
  if (starting) return 'Iniciando…'
  return startError ? 'Tentar novamente' : 'Iniciar meu ciclo de 66 dias'
}

export function Projeto66OverviewPage() {
  const { cycle, progress, currentDay, currentStreak, phaseProgress, scoreStats, startCycle } = useProjeto66Cycle()
  const available = cycle.status === 'AVAILABLE'
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)
  const streakTitle = `${currentStreak} ${currentStreak === 1 ? 'dia' : 'dias'}`
  const activeDescription = `Você está no dia ${currentDay}. Cada registro fortalece sua nova identidade.`
  const bestDayDescription = scoreStats.best ? `dia ${scoreStats.best.day}` : 'nenhum registro'

  async function beginCycle() {
    setStarting(true)
    setStartError(null)
    try {
      await startCycle()
    } catch (error) {
      setStartError(error)
    } finally {
      setStarting(false)
    }
  }
  return (
    <>
      <section className="p66-hero-card">
        <div className="p66-ring" style={{ '--progress': `${progress * 3.6}deg` }}><strong>{progress}</strong><small>%</small></div>
        <div><span>🔥 Sequência atual</span><h1>{available ? 'Acenda a chama' : streakTitle}</h1><p>{available ? 'Seu ciclo está disponível. Você escolhe o momento de começar.' : activeDescription}</p></div>
      </section>
      <section className="p66-callout"><b>🔥</b><p><strong>Bem-vindo ao Comando.</strong> O ciclo avança por dias corridos depois que você inicia.</p></section>
      <section className="p66-kpis">
        <article><i>📅</i><strong>{cycle.completedDays.length}</strong><span>Dias concluídos</span><small>{progress}% de 66</small></article>
        <article><i>📊</i><strong className="purple">{scoreStats.averageLast7 ?? '—'}</strong><span>Média do placar</span><small>últimos 7 registros /60</small></article>
        <article><i>🏆</i><strong className="green">{scoreStats.best?.score ?? '—'}</strong><span>Melhor placar</span><small>{bestDayDescription}</small></article>
        <article><i>🔥</i><strong className="gold">F{currentPhase(currentDay)}</strong><span>Fase atual</span><small>{phaseProgress[0].completed + phaseProgress[1].completed + phaseProgress[2].completed} registros concluídos</small></article>
      </section>
      {available ? <><button className="p66-primary" disabled={starting} type="button" onClick={beginCycle}>{startButtonLabel(starting, startError)}</button>{startError && <p className="p66-action-error" role="alert">Não foi possível iniciar o ciclo. Revise sua conexão e tente novamente.</p>}</> : <Link className="p66-primary" to="hoje">Registrar o dia</Link>}
    </>
  )
}
