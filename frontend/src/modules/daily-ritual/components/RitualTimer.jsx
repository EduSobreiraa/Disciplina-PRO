import { TIMER_SECONDS, TOTAL_CYCLES } from '../data/ritual-content'

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export function RitualTimer({ timer, onToggle, onReset }) {
  const complete = timer.completedCycles >= TOTAL_CYCLES
  const buttonLabel = complete ? '✓ Dia completo' : timer.running ? '⏸ Pausar ciclo' : timer.remainingSeconds < TIMER_SECONDS ? '▶ Retomar ciclo' : timer.completedCycles ? '▶ Próximo ciclo' : '▶ Iniciar ciclo'
  return <section className={`ritual-timer ${timer.running ? 'running' : ''}`}>
    <div className="ritual-clock" aria-live="off">{formatTime(timer.remainingSeconds)}</div>
    <div className="ritual-timer-info"><span>Protocolo de foco</span><h2>⚡ WhatsApp 30/30</h2><p>A cada 30 minutos, verifique mensagens, responda pendências e marque o ciclo.</p>
      <div className="ritual-timer-actions"><button className="primary" disabled={complete} type="button" onClick={onToggle}>{buttonLabel}</button><button type="button" onClick={onReset}>↺ Reiniciar</button></div>
      <div className="ritual-cycles" aria-label={`${timer.completedCycles} de ${TOTAL_CYCLES} ciclos concluídos`}>{Array.from({ length: TOTAL_CYCLES }, (_, index) => <i className={index < timer.completedCycles ? 'done' : index === timer.completedCycles && !complete ? 'current' : ''} key={index}>{index < timer.completedCycles ? '✓' : index + 1}</i>)}</div>
    </div>
  </section>
}
