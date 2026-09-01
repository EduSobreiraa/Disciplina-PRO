import { useRef, useState } from 'react'
import { JustificationCenter } from '../components/JustificationCenter'
import { JustificationDialog } from '../components/JustificationDialog'
import { TrackerInsights } from '../components/TrackerInsights'
import { useDisciplineTracker } from '../hooks/useDisciplineTracker'
import { parseTrackerBackup } from '../services/tracker-backup'
import { getMarkKey, getScoreClass } from '../services/tracker-stats'
import '../styles/discipline-tracker.css'
import '../styles/tracker-insights.css'

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function DisciplineTrackerPage() {
  const now = new Date()
  const year = now.getFullYear()
  const [month, setMonth] = useState(now.getMonth())
  const [newBehavior, setNewBehavior] = useState('')
  const [justification, setJustification] = useState(null)
  const [backupMessage, setBackupMessage] = useState('')
  const importInput = useRef(null)
  const tracker = useDisciplineTracker(year, month)
  const behaviors = tracker.state.behaviors.filter((behavior) => behavior.active).sort((a, b) => a.order - b.order)
  const days = new Date(year, month + 1, 0).getDate()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const justificationItems = Object.entries(tracker.state.marks).filter(([key, status]) => key.startsWith(monthPrefix) && status === 2).map(([key]) => {
    const behaviorId = key.split(':')[1]
    return { key, day: Number(key.slice(monthPrefix.length, monthPrefix.length + 2)), behaviorName: tracker.state.behaviors.find((behavior) => behavior.id === behaviorId)?.name ?? 'Comportamento removido', text: tracker.state.justifications[key] ?? '' }
  }).sort((a, b) => b.day - a.day)

  async function mark(day, behavior) {
    if (new Date(year, month, day) > now) return
    const result = await tracker.cycleMark(day, behavior.id)
    if (result.status === 2) setJustification({ key: result.key, day, behaviorName: behavior.name, text: tracker.state.justifications[result.key] ?? '' })
  }
  async function submitBehavior(event) { event.preventDefault(); if (newBehavior.trim()) { await tracker.addBehavior(newBehavior); setNewBehavior('') } }
  async function exportBackup() {
    const backup = await tracker.exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `disciplina-pro-tracker-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
    setBackupMessage('Backup completo exportado com sucesso.')
  }
  async function importBackup(event) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try {
      const backup = parseTrackerBackup(await file.text())
      if (!window.confirm('A restauração substituirá atomicamente todo o seu tracker. Continuar?')) return
      await tracker.restoreBackup(backup)
      setBackupMessage('Backup restaurado com sucesso.')
    } catch (error) { setBackupMessage(error.message) }
  }
  return <>
    <section className="page-heading"><span className="eyebrow">Disciplina célula por célula</span><h1>Minha <em>evolução</em></h1><p>Acompanhe comportamentos objetivos e registre a causa de cada desvio.</p></section>
    {tracker.status === 'loading' && <section className="tracker-state" role="status">Carregando tracker…</section>}
    {tracker.status === 'error' && <section className="tracker-state error" role="alert"><strong>Não foi possível sincronizar o tracker.</strong><span>{tracker.error?.message}</span><button className="button" type="button" onClick={() => tracker.reload().catch(() => {})}>Tentar novamente</button></section>}
    <section className="tracker-kpis"><article className={getScoreClass(tracker.stats.percent)}><span>Disciplina do mês</span><strong>{tracker.stats.percent === null ? '—' : `${tracker.stats.percent}%`}</strong></article><article className="green"><span>Dias marcados</span><strong>{tracker.stats.markedDays}</strong></article><article className="gold"><span>Dias perfeitos</span><strong>{tracker.stats.perfectDays}</strong></article><article className="red"><span>Falhas registradas</span><strong>{tracker.stats.reds}</strong></article></section>
    <div className="tracker-months" aria-label="Selecionar mês">{months.map((name, index) => <button className={month === index ? 'active' : ''} type="button" key={name} onClick={() => setMonth(index)}>{name}</button>)}</div>
    <section className="tracker-panel"><div className="tracker-scroll"><table><thead><tr><th className="behavior-col">Comportamento</th>{Array.from({ length: days }, (_, index) => <th className={month === now.getMonth() && index + 1 === now.getDate() ? 'today' : ''} key={index}>{index + 1}</th>)}<th>%</th></tr></thead><tbody>{behaviors.map((behavior) => { const behaviorStats = tracker.stats.byBehavior[behavior.id]; const total = behaviorStats.greens + behaviorStats.reds; const percent = total ? Math.round(behaviorStats.greens / total * 100) : null; return <tr key={behavior.id}><td className="behavior-col"><input defaultValue={behavior.name} disabled={tracker.mutating} aria-label={`Comportamento ${behavior.name}`} onBlur={(event) => tracker.renameBehavior(behavior.id, event.target.value).catch(() => {})}/><button disabled={tracker.mutating} type="button" aria-label={`Remover ${behavior.name}`} onClick={() => tracker.removeBehavior(behavior.id).catch(() => {})}>×</button></td>{Array.from({ length: days }, (_, index) => { const day = index + 1; const key = getMarkKey(year, month, day, behavior.id); const status = tracker.state.marks[key] ?? 0; const future = new Date(year, month, day) > now; const nextAction = status === 0 ? 'marcar como cumprido' : status === 1 ? 'marcar como falhou' : 'limpar marcação'; return <td key={day}><button className={`mark status-${status} ${future ? 'future' : ''}`} disabled={future || tracker.mutating} type="button" aria-label={`${behavior.name}, dia ${day}: ${status === 1 ? 'cumprido' : status === 2 ? 'falhou' : 'sem marcação'}. Clique para ${nextAction}.`} title={`Clique para ${nextAction}`} onClick={() => mark(day, behavior).catch(() => {})}>{status === 1 ? '✓' : status === 2 ? '!' : ''}{status === 2 && tracker.state.justifications[key] && <i />}</button></td> })}<td className={`behavior-score ${getScoreClass(percent)}`}>{percent === null ? '—' : `${percent}%`}</td></tr> })}</tbody></table></div><form className="tracker-add" onSubmit={(event) => submitBehavior(event).catch(() => {})}><label htmlFor="new-behavior">Novo comportamento</label><input id="new-behavior" disabled={tracker.mutating} maxLength="200" value={newBehavior} onChange={(event) => setNewBehavior(event.target.value)} placeholder="Ex.: iniciar trabalho às 8h"/><button disabled={tracker.mutating || !newBehavior.trim() || behaviors.length >= 20} type="submit">+ Adicionar</button><span>{behaviors.length}/20</span></form><div className="tracker-actions"><div className="tracker-legend"><span><i className="green"/>Cumprido</span><span><i className="red"/>Falhou</span><span>Toque: vazio → verde → vermelho</span></div><div><button disabled={tracker.mutating} type="button" onClick={() => exportBackup().catch((error) => setBackupMessage(error.message))}>Exportar backup</button><button disabled={tracker.mutating} type="button" onClick={() => importInput.current?.click()}>Importar backup</button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={importBackup}/></div></div>{backupMessage && <p className="tracker-backup-message" role="status">{backupMessage}</p>}</section>
    <TrackerInsights behaviors={behaviors} stats={tracker.stats}/>
    <JustificationCenter items={justificationItems} onEdit={setJustification}/>
    {justification && <JustificationDialog
      key={justification.key}
      target={justification}
      onClose={() => setJustification(null)}
      onSave={(text) => { tracker.saveJustification(justification.key, text).then(() => setJustification(null)).catch(() => {}) }}
    />}
  </>
}
