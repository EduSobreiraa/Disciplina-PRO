import { useState } from 'react'
import { JustificationDialog } from '../components/JustificationDialog'
import { useDisciplineTracker } from '../hooks/useDisciplineTracker'
import { getMarkKey, getScoreClass } from '../services/tracker-stats'
import '../styles/discipline-tracker.css'

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function DisciplineTrackerPage() {
  const now = new Date(); const year = now.getFullYear()
  const [month, setMonth] = useState(now.getMonth())
  const [newBehavior, setNewBehavior] = useState('')
  const [justification, setJustification] = useState(null)
  const tracker = useDisciplineTracker(year, month)
  const behaviors = tracker.state.behaviors.filter((behavior) => behavior.active).sort((a, b) => a.order - b.order)
  const days = new Date(year, month + 1, 0).getDate()
  function mark(day, behavior) {
    if (new Date(year, month, day) > now) return
    const result = tracker.cycleMark(day, behavior.id)
    if (result.status === 2) setJustification({ key: result.key, day, behaviorName: behavior.name, text: tracker.state.justifications[result.key] ?? '' })
  }
  function submitBehavior(event) { event.preventDefault(); if (newBehavior.trim() && tracker.addBehavior(newBehavior)) setNewBehavior('') }
  return <><section className="page-heading"><span className="eyebrow">Disciplina célula por célula</span><h1>Minha <em>evolução</em></h1><p>Acompanhe comportamentos objetivos e registre a causa de cada desvio.</p></section><section className="tracker-kpis"><article className={getScoreClass(tracker.stats.percent)}><span>Disciplina do mês</span><strong>{tracker.stats.percent === null ? '—' : `${tracker.stats.percent}%`}</strong></article><article className="green"><span>Marcas verdes</span><strong>{tracker.stats.greens}</strong></article><article className="red"><span>Marcas vermelhas</span><strong>{tracker.stats.reds}</strong></article><article className="gold"><span>Comportamentos</span><strong>{behaviors.length}<small>/20</small></strong></article></section><div className="tracker-months" aria-label="Selecionar mês">{months.map((name, index) => <button className={month === index ? 'active' : ''} type="button" key={name} onClick={() => setMonth(index)}>{name}</button>)}</div><section className="tracker-panel"><div className="tracker-scroll"><table><thead><tr><th className="behavior-col">Comportamento</th>{Array.from({ length: days }, (_, index) => <th className={month === now.getMonth() && index + 1 === now.getDate() ? 'today' : ''} key={index}>{index + 1}</th>)}<th>%</th></tr></thead><tbody>{behaviors.map((behavior) => { const behaviorStats = tracker.stats.byBehavior[behavior.id]; const total = behaviorStats.greens + behaviorStats.reds; const percent = total ? Math.round(behaviorStats.greens / total * 100) : null; return <tr key={behavior.id}><td className="behavior-col"><input defaultValue={behavior.name} aria-label={`Comportamento ${behavior.name}`} onBlur={(event) => tracker.renameBehavior(behavior.id, event.target.value)}/><button type="button" aria-label={`Remover ${behavior.name}`} onClick={() => tracker.removeBehavior(behavior.id)}>×</button></td>{Array.from({ length: days }, (_, index) => { const day = index + 1; const key = getMarkKey(year, month, day, behavior.id); const status = tracker.state.marks[key] ?? 0; const future = new Date(year, month, day) > now; return <td key={day}><button className={`mark status-${status} ${future ? 'future' : ''}`} disabled={future} type="button" aria-label={`${behavior.name}, dia ${day}: ${status === 1 ? 'verde' : status === 2 ? 'vermelho' : 'vazio'}`} onClick={() => mark(day, behavior)}>{status === 1 ? '✓' : status === 2 ? '!' : ''}{status === 2 && tracker.state.justifications[key] && <i />}</button></td> })}<td className={`behavior-score ${getScoreClass(percent)}`}>{percent === null ? '—' : `${percent}%`}</td></tr> })}</tbody></table></div><form className="tracker-add" onSubmit={submitBehavior}><input maxLength="200" value={newBehavior} onChange={(event) => setNewBehavior(event.target.value)} placeholder="Novo comportamento objetivo"/><button disabled={!newBehavior.trim() || behaviors.length >= 20} type="submit">+ Adicionar</button><span>{behaviors.length}/20</span></form><div className="tracker-legend"><span><i className="green"/>Cumprido</span><span><i className="red"/>Falhou</span><span>Toque: vazio → verde → vermelho</span></div></section>{justification && <JustificationDialog target={justification} onClose={() => setJustification(null)} onSave={(text) => { tracker.saveJustification(justification.key, text); setJustification(null) }}/>}</>
}
