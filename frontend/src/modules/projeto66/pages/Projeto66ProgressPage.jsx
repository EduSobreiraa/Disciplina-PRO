import { projeto66Phases } from '../data/projeto66-content'
import { ScoreLineChart } from '../components/charts/ScoreLineChart'
import { ProgramHeatmap } from '../components/progress/ProgramHeatmap'
import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'

export function Projeto66ProgressPage() {
  const { cycle, progress, currentDay, currentStreak, bestStreak, phaseProgress, scoreStats } = useProjeto66Cycle()
  return <><header className="p66-page-title"><span>Sua evolução</span><h1>Tracker</h1></header><section className="p66-progress-card"><div><strong>{cycle.completedDays.length}</strong><span>de 66 dias</span></div><small>{progress}%</small><i><b style={{ width: `${progress}%` }} /></i></section><section className="p66-tracker-kpis"><article><strong>{currentDay || '—'}</strong><span>Dia atual</span></article><article><strong>{currentStreak}</strong><span>Sequência</span></article><article><strong>{bestStreak}</strong><span>Melhor sequência</span></article></section><h2 className="p66-section-title">Mapa de calor — 66 dias</h2><ProgramHeatmap dailyRecords={cycle.dailyRecords} currentDay={currentDay} /><div className="p66-heat-legend"><span><i className="pending"/>Pendente</span><span><i className="low"/>Baixo</span><span><i className="medium"/>Bom</span><span><i className="high"/>Excelente</span></div><h2 className="p66-section-title">Progresso por fase</h2><section className="p66-phase-progress">{projeto66Phases.map((phase, index) => <article key={phase.id} style={{ '--phase': phase.color }}><strong>{phaseProgress[index].percent}%</strong><span>Fase {phase.id}</span><small>{phaseProgress[index].completed} de 22 dias</small></article>)}</section><h2 className="p66-section-title">Evolução do placar</h2><ScoreLineChart records={scoreStats.records} /></>
}
