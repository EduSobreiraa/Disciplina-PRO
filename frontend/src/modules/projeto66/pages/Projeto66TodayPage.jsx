import { useState } from 'react'
import { defaultChecklist } from '../data/projeto66-content'
import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'
import { getChecklistStats } from '../services/checklist'
import { projeto66ChecklistActivityKey } from '../data/projeto66-contract'

const sections = [
  { key: 'morning', title: 'Manhã', icon: '☀️', subtitle: 'Comece vencendo', items: defaultChecklist.morning },
  { key: 'day', title: 'Durante o dia', icon: '⚡', subtitle: 'Execute com intenção', items: defaultChecklist.day },
  { key: 'night', title: 'Noite', icon: '🌙', subtitle: 'Feche o ciclo', items: defaultChecklist.night },
]
const totalItems = sections.reduce((total, section) => total + section.items.length, 0)
const itemKey = projeto66ChecklistActivityKey

export function Projeto66TodayPage() {
  const { cycle, currentDay, saveChecklist } = useProjeto66Cycle()
  const day = currentDay || 1
  const checklist = cycle.checklistByDay[day] ?? {}
  const stats = getChecklistStats(checklist, totalItems)
  const active = cycle.status === 'ACTIVE'
  const [savingKey, setSavingKey] = useState(null)
  const [failedItem, setFailedItem] = useState(null)

  async function toggleItem(sectionKey, index) {
    if (!active) return
    const key = itemKey(sectionKey, index)
    if (checklist[key]) return
    setSavingKey(key)
    setFailedItem(null)
    try {
      await saveChecklist(day, { ...checklist, [key]: true })
    } catch {
      setFailedItem({ sectionKey, index })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <>
      <header className="p66-page-title p66-check-title"><div><span>{active ? `Dia ${day} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}` : 'Ciclo ainda não iniciado'}</span><h1>Checklist</h1></div><strong>{stats.checked}/{stats.total}</strong></header>
      <section className={`p66-check-progress ${stats.commandDay ? 'command' : ''}`}><div><i style={{ width: `${stats.percent}%` }} /></div><p>{stats.complete ? '🏆 Checklist completo. Dia dominado.' : stats.commandDay ? '🔥 Dia de Comando conquistado.' : `Marque mais ${Math.max(0, 10 - stats.checked)} para um Dia de Comando.`}</p></section>
      {!active && <section className="p66-callout"><b>🔥</b><p><strong>Inicie seu ciclo primeiro.</strong> O checklist será liberado no seu primeiro dia.</p></section>}
      {sections.map((section) => {
        const sectionChecked = section.items.filter((_, index) => checklist[itemKey(section.key, index)]).length
        return <section className="p66-check-group" key={section.key}><header><div><b>{section.icon}</b><span><strong>{section.title}</strong><small>{section.subtitle}</small></span></div><em>{sectionChecked}/{section.items.length}</em></header>{section.items.map((item, index) => { const key = itemKey(section.key, index); const checked = Boolean(checklist[key]); const canComplete = active && !checked && savingKey !== key; return <button aria-label={canComplete ? `Marcar ${item} como concluída. Esta ação não pode ser desfeita.` : undefined} disabled={!active || checked || savingKey === key} className={checked ? 'checked' : ''} title={canComplete ? 'Marcar como concluída — esta ação não pode ser desfeita' : undefined} type="button" key={item} onClick={() => toggleItem(section.key, index)}><i>{checked ? '✓' : ''}</i><span>{savingKey === key ? 'Salvando…' : item}</span></button> })}</section>
      })}
      {failedItem && <div className="p66-action-error" role="alert">Não foi possível salvar esta conclusão.<button type="button" onClick={() => toggleItem(failedItem.sectionKey, failedItem.index)}>Tentar novamente</button></div>}
      <p className="p66-private-note">Conclusões são fatos permanentes do dia e não podem ser desmarcadas.</p>
    </>
  )
}
