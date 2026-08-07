import { RitualSection } from '../components/RitualSection'
import { RitualTimer } from '../components/RitualTimer'
import { ritualSections } from '../data/ritual-content'
import { useDailyRitual } from '../hooks/useDailyRitual'
import '../styles/daily-ritual.css'

export function DailyRitualPage() {
  const ritual = useDailyRitual()
  return <><header className="page-title ritual-title"><span className="eyebrow">Disciplina célula por célula</span><h1>Ritual do <em>dia</em></h1><p>Abra com intenção, execute em tempo real e feche prestando contas.</p></header>
    {ritual.status === 'loading' && <section className="ritual-state" role="status">Carregando ritual…</section>}
    {ritual.status === 'error' && <section className="ritual-state error" role="alert"><strong>Não foi possível sincronizar o ritual.</strong><span>{ritual.error?.message}</span><button className="button" type="button" onClick={() => ritual.reload().catch(() => {})}>Tentar novamente</button></section>}
    <section className="ritual-summary"><div><strong>{ritual.progress.percent}%</strong><span>ritual concluído hoje</span></div><div><b>{ritual.progress.completed}</b><span>de {ritual.progress.total} etapas</span></div></section>
    <RitualTimer busy={ritual.mutating} timer={ritual.timer} onToggle={() => ritual.toggleTimer().catch(() => {})} onReset={() => { if (window.confirm('Reiniciar os oito ciclos de hoje?')) ritual.resetTimer().catch(() => {}) }} />
    <div className="ritual-sections">{ritualSections.map((section) => <RitualSection busy={ritual.mutating} key={section.key} section={section} checks={ritual.checks[section.key]} onToggle={(...args) => ritual.toggleCheck(...args).catch(() => {})} />)}</div>
  </>
}
